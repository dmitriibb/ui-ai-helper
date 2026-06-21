# Idea
The idea of this prokect - make a tool which can be used by AI agents to help users with navigation in web-browsing and any other applications

# Problem
When I navigate through moders web-sites or any other desktop applications - there are many elements and I am not sure where to go and what buttons to press. When I am confused I make a screenshot, put it in the AI agent chat and ask my question. Agent then tells me where to go and what to press.

### Issues
- I need to make a new screenshot each time and sometimes draw something (hightlighting some key elements or details). Not a big problem, but I think this expirience can be better
- When AI Agent tells me what to do - I need to reed it. Would be better to see it.

### Solution
- An app that can see what is displayed on desktop and allow AI Agents to automatically mase screenshots 
- The app is different from Web-browser MCP or playwrite things, Because the app works as a screen recording and can see ANY desktop app.
- When AI Agent gives and answer - it can use the app UI to display something like arrows, pointers, frames, text. So User can see instructions / tips on the screen
- The UI of this app should look like a frame with posibility to easily resize it. Whatever is inside this frame - Agent can see it


I am not sure what will be the best way to implement communication between this App and AI Agent app. I think of implementing it as MCP or just a skill with clear instructions how to call the app's API. If there is another better way - tell me