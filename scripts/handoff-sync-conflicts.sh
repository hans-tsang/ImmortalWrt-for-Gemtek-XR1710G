#!/usr/bin/env bash

# Hand an upstream sync that scripts/resolve-sync-conflicts.sh could not finish
# over to the Copilot coding agent instead of just failing the job.
#
# It is also used when the merge itself succeeded but the resulting tree still
# violates the no-Chinese policy, i.e. when upstream added Chinese text in hunks
# that merged cleanly and therefore need a human or agent translation.  Pass the
# reason through HANDOFF_REASON in that case.
#
# The unfinished merge (conflict markers and all) is committed on a throw-away
# branch and pushed.  The agent is then started directly with `gh agent-task
# create`, which opens a pull request off that branch; this works even when the
# repository has issues disabled.  That command needs an OAuth token, so it is
# unavailable with the default GITHUB_TOKEN; the script then opens a normal pull
# request from the conflict branch and asks Copilot to take it over, and only
# falls back to an issue when pull requests are unavailable too.
#
# Requires the calling workflow to grant `contents: write`, `pull-requests:
# write` and `issues: write` and to export GH_TOKEN (or GITHUB_TOKEN).  When no
# hand-off route works the conflict branch is still pushed, so nothing is lost.

set -euo pipefail

REPO="${GITHUB_REPOSITORY:-}"
TOKEN="${GH_TOKEN:-${GITHUB_TOKEN:-}}"
RUN_URL="${GITHUB_SERVER_URL:-https://github.com}/${REPO}/actions/runs/${GITHUB_RUN_ID:-0}"
TARGET_BRANCH="${TARGET_BRANCH:-master}"

REASON="${HANDOFF_REASON:-}"

conflicts="$(git diff --name-only --diff-filter=U || true)"
if [ -z "$conflicts" ]; then
  if [ -z "$REASON" ]; then
    echo "No conflicts left, nothing to hand off."
    exit 0
  fi
  conflicts="(none - the merge itself succeeded)"
  echo "Handing off a completed merge: $REASON"
else
  echo "Unresolved conflicts:"
  echo "$conflicts"
fi

branch="sync-conflict/$(date -u +%Y%m%d-%H%M%S)"

# Commit the conflicted tree as-is.  The markers are intentionally kept: they
# are the very thing the agent has to resolve.  When the merge itself succeeded
# the tree is already clean and committed, so there is nothing to add and
# `git commit` would fail; the existing merge commit is handed off instead.
git add -A
if git diff --cached --quiet; then
  if [ "$(git rev-parse HEAD)" = "$(git rev-parse "origin/$TARGET_BRANCH" 2>/dev/null || echo none)" ]; then
    echo "::error::Nothing to hand off: the working tree is clean and HEAD already matches origin/$TARGET_BRANCH."
    exit 1
  fi
  echo "Working tree is clean, handing off the existing merge commit."
else
  git commit -q --no-verify -m "chore: upstream sync pending manual resolution

Conflicted files:
$conflicts

Produced by $RUN_URL"
fi

if ! git push origin "HEAD:refs/heads/$branch"; then
  echo "::error::Could not push the conflict branch $branch."
  exit 1
fi
echo "Pushed conflict branch: $branch"

if [ -z "$TOKEN" ] || [ -z "$REPO" ] || ! command -v gh > /dev/null 2>&1; then
  echo "::warning::No GitHub CLI or token available, skipping the Copilot handoff."
  exit 1
fi
export GH_TOKEN="$TOKEN"

title="Resolve upstream sync conflicts on $branch"
body="$(cat <<EOF
The scheduled upstream sync could not be completed automatically.
${REASON:+
Reason: $REASON
}
The unfinished merge has been committed **with any conflict markers** on the
branch \`$branch\` so it can be resolved without re-running the merge.

Conflicted files:

$(printf '%s\n' "$conflicts" | sed 's/^/- `/; s/$/`/')

Failing workflow run: $RUN_URL

@copilot please resolve this:

1. Work on \`$branch\`; check it out first if you are not already based on it.
2. Resolve every conflict, honouring this fork's customizations: the local
   English \`README.md\` wins, \`1710.config\` / \`2010.config\` keep the local
   build options but pick up new upstream entries, and files removed by
   \`scripts/enforce-no-chinese.sh\` stay removed.  When upstream changed a file
   that this fork only translated, keep the upstream behaviour but write its
   comments and strings in English.
3. Remove all conflict markers and make \`bash scripts/enforce-no-chinese.sh\`
   pass: translate every Chinese string or comment that upstream added into
   English instead of reverting the upstream change.
4. If the conflict is one that recurs on every sync, teach
   \`scripts/resolve-sync-conflicts.sh\` to handle it so the next sync is automatic.
5. Open a pull request with the resolved merge so it can land on \`$TARGET_BRANCH\`.
EOF
)"

# Assigning the Copilot coding agent only works through GraphQL, and only when
# the agent is listed as an assignable actor for this repository.  Works for
# both issues and pull requests; $2 selects the REST collection to resolve the
# node id from.
assign_copilot() {
  local number="$1" kind="$2" bot_id node_id owner name
  owner="${REPO%%/*}"
  name="${REPO##*/}"

  bot_id="$(gh api graphql -f owner="$owner" -f name="$name" -f query='
    query($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        suggestedActors(capabilities: [CAN_BE_ASSIGNED], first: 100) {
          nodes { login __typename ... on Bot { id } ... on User { id } }
        }
      }
    }' --jq '.data.repository.suggestedActors.nodes[] | select(.login == "copilot-swe-agent" or .login == "Copilot") | .id' 2>/dev/null | head -n1)" || bot_id=""

  if [ -z "$bot_id" ]; then
    echo "::warning::Copilot is not assignable here; the hand-off only mentions @copilot."
    return 1
  fi

  node_id="$(gh api "repos/$REPO/$kind/$number" --jq '.node_id')" || return 1

  if gh api graphql -f assignableId="$node_id" -f actorId="$bot_id" -f query='
    mutation($assignableId: ID!, $actorId: ID!) {
      replaceActorsForAssignable(input: { assignableId: $assignableId, actorIds: [$actorId] }) {
        assignable { ... on Issue { number } ... on PullRequest { number } }
      }
    }' > /dev/null; then
    echo "Assigned Copilot to $kind #$number."
  else
    echo "::warning::Could not assign Copilot to $kind #$number."
    return 1
  fi
}

# Preferred route: start the coding agent directly on the conflict branch.  It
# needs neither issues nor an assignable Copilot actor, which is why it is tried
# before the issue based hand-off.
if gh agent-task create --repo "$REPO" --base "$branch" -F - <<< "$body"; then
  echo "Started a Copilot coding agent task on $branch."
  exit 1
fi
echo "::warning::Could not start a Copilot coding agent task, falling back to a pull request."

# `gh agent-task create` only accepts OAuth tokens, so it is unusable with the
# workflow's GITHUB_TOKEN.  A pull request works with any token that has
# `pull-requests: write` and, unlike issues, cannot be disabled for the
# repository, which makes it the reliable hand-off route here.
pr_url="$(gh pr create --repo "$REPO" --base "$TARGET_BRANCH" --head "$branch" \
  --title "$title" --body "$body")" || pr_url=""

if [ -n "$pr_url" ]; then
  echo "Opened $pr_url"
  assign_copilot "${pr_url##*/}" pulls || true
  exit 1
fi
echo "::warning::Could not open a pull request, falling back to an issue."

issue_url="$(gh issue create --repo "$REPO" --title "$title" --body "$body")" || {
  echo "::error::Could not hand the sync conflicts to Copilot: starting an agent task, opening a pull request and creating an issue all failed (issues may be disabled for this repository). Resolve $branch manually."
  exit 1
}
echo "Opened $issue_url"

assign_copilot "${issue_url##*/}" issues || true

exit 1
