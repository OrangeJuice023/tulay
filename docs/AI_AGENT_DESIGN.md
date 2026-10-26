# AI Agent Design

## Principles
- **Assistant, not arbiter**: AI suggests/explains/drafts, never decides or authorizes
- **Grounded in reality**: Only explain relevance of verified candidates from DB
- **Untrusted output**: Validate all AI responses with schemas
- **Graceful degradation**: Demo mode if no credentials
- **Privacy-aware**: Minimal data sent to API, no secrets exposed

## Use Cases
1. **Goal Extraction**: Parse natural language into structured {goal, needs[], offers[], skills[], preferences}
2. **Request Normalization**: Consistent schema across inputs
3. **Match Explanation**: Explain why verified candidate is relevant (complementary needs/offers)
4. **Message Drafting**: Draft introduction messages for review/edit
5. **Collaboration Suggestions**: Suggest concrete next steps based on goals

## Provider Abstraction
Location: services/ai/

`	ypescript
interface AIProvider {
  extractGoal(input: string): Promise<ExtractedGoal>
  explainMatch(candidate: Profile, requester: Profile): Promise<MatchExplanation>
  draftIntroduction(match: MatchContext): Promise<IntroDraft>
  suggestCollaboration(match: MatchContext): Promise<CollabSuggestion>
}
`

Implementations: MetaModelProvider, DemoProvider (deterministic)

## Schema Validation
All outputs validated with Zod schemas in packages/shared/schemas/ai.ts

## Meta Model API Integration
**Must verify before implementing:**
- Current official docs for Meta Model API
- Available model names
- Authentication method (API key format)
- Endpoint URL
- Request/response format
- Structured output/tool calling support
- Rate limits

**Never invent** endpoints, SDK methods, model names, env vars.

## Environment Variables
`env
META_MODEL_API_KEY=  # server-side only
META_MODEL_API_URL=
META_MODEL_MODEL=
AI_PROVIDER=meta|demo  # default demo if key missing
`

## Safety
- Keys in env vars only, never sent to client
- Validate responses before use
- Timeout handling
- Rate limit awareness
- Error handling with user-friendly messages
- Log errors without PII
- Demo mode clearly labeled
