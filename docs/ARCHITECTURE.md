# AdBrain architecture

## Product
- App: AdBrain
- Model experience: AdBrain One (AB-1)
- Platform: Expo / React Native
- Default theme: Light
- Processing: local-first
- Paid AI APIs: none required

## Intelligence layers
1. Chat router
2. Deterministic marketing analysis tools
3. On-device language model runtime
4. Project + brand + user memory
5. Feedback signals and preference ranking
6. Controlled future model updates

## Privacy controls
Memory, Improve AdBrain, and Chat History are independent user controls.

## Local data
SQLite stores projects, chats, messages, memories, feedback and learned preferences.
Small app preferences are stored separately on-device.

## Future model integration
The model runtime will be isolated behind src/model so the UI and data layers do not depend on a single runtime.
