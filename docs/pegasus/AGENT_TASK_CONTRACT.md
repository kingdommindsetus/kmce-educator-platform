# Pegasus Agent Task Contract v1

Every Pegasus job should normalize to this contract.

```json
{
  "task_id": "uuid",
  "company_id": "tenant-id",
  "requested_by": "founder|system|agent|client",
  "assigned_agent": "simon|marie|iris|mark|cammy|evan|tube|lucy|snake|alice|echo|booker",
  "objective": "clear desired outcome",
  "inputs": [],
  "tools_allowed": [],
  "approval_policy": "none|before_external_action|before_publish|before_destructive_action",
  "status": "queued|running|waiting_approval|blocked|failed|complete",
  "completion_contract": [],
  "evidence": [],
  "result": null,
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

## Rule
An agent response is not completion. Completion occurs only when the task's completion contract is satisfied and evidence is attached.

## Handoff
Agent A may request Agent B through Pegasus. The handoff must preserve company_id, objective, evidence, authority boundary and correlation/task ID.

## Founder visibility
Waiting approvals, failures, retries and blockers must be first-class Command Center states, not buried in logs.
