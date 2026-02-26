# Session Completion Tracking Design

## Problem

- FSM의 `done` 상태가 도달 불가능 (TaskCompleted 이벤트 미처리)
- 세션 종료 시 에이전트가 즉시 삭제되어 완료 이력 없음
- "어떤 루트 폴더의 어떤 세션이 완료됐는지" 표시 불가

## Design

### 1. FSM — TaskCompleted → done 전이
- `active`, `idle`, `listening`, `waiting`, `error` 상태에서 `TaskCompleted` → `done`
- `Stop`은 기존대로 `idle` 유지

### 2. SessionStore — CompletedSession 이력
- `CompletedSession` 타입: sessionId, cwd, projectName, completedAt, lastPrompt, displayName
- `SessionEnd` 시 `done` 상태였으면 completedSessions에 추가 (max 50)
- getCompletedSessions() 메서드 노출

### 3. WS Protocol
- `agent:state`에 `timestamp` 필드 추가
- `agent:completed` 메시지 타입 추가 (sessionId, cwd, projectName, completedAt, displayName)
- `snapshot`에 `completedSessions` 포함

### 4. Server
- `SessionEnd` 처리 시 done 상태면 `agent:completed` 브로드캐스트
- 30초 딜레이 후 자동 `agent:despawn`

### 5. UI
- `useWebSocket`에서 `agent:completed` 처리 → completedSessions 상태 추가
- `CompletionLog` 컴포넌트: 프로젝트별 완료 세션 표시
- `RightPanel`에 CompletionLog 섹션 추가
- `done` 에이전트 30초간 사이드바 잔류

### 6. Hook Registration
- install.ts에 TeammateIdle, ConfigChange, WorktreeCreate, WorktreeRemove 추가
