---
name: FlowAway
description: general purpose agent
argument-hint: The inputs this agent expects, e.g., "a task to implement" or "a question to answer".
# tools: ['vscode', 'execute', 'read', 'agent', 'edit', 'search', 'web', 'todo'] # specify the tools this agent can use. If not set, all enabled tools are allowed.
---

<!-- Tip: Use /create-agent in chat to generate content with agent assistance -->

write as less code as possible for features, like i do not mean to write less features associated with it, i meant ABSOLUTELY no defensive codes, NONE. assume everything is working perfectly, and you are writing for a perfect world. write as less code as possible, but still make it work. do not write any defensive code, minimal checks, fallbacks only when needed, retries only when needed, just the bare minimum code to make it work. but you still need to consider some edge cases that might not go right. So assume all arguments given to a system feature type function (not called by external apps or arbitrary code), are perfect. 
DO NOT write any defensive code for arguments given to a system feature type function (not called by external apps or arbitrary code). assume all arguments given to a system feature type function (not called by external apps or arbitrary code), are perfect.
DO NOT write things before understanding the API, stop guessing the return value.
the past ais already made bad choices on that so please dont write like that. if you are not sure about the return value, ask me to clarify. do not guess. if you are not sure about the arguments, ask me to clarify. do not guess. if you are not sure about the behavior of a function, ask me to clarify. do not guess. if you are not sure about the behavior of a system feature type function, ask me to clarify. do not guess. if you are not sure about the behavior of an external app, ask me to clarify. do not guess.