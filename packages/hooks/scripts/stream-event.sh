#!/bin/bash
# claude-alive hook: streams Claude Code events to the local server.
# Designed to be fast and non-blocking — failures are silent.

INPUT=$(cat)

# Post to server in background, suppress all output
curl -s -X POST "http://localhost:${CLAUDE_ALIVE_PORT:-3141}/api/event" \
  -H "Content-Type: application/json" \
  -m 2 \
  -d "$INPUT" > /dev/null 2>&1 &

exit 0
