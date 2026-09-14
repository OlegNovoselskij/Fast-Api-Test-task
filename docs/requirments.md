# Test task for Senior React Native @Fans Holdings

Build and debug a fan chat screen in Expo, React Native and TypeScript. It should keep messages safe when the connection drops, handle paid access correctly and feel good to use.

This is an exercise for shortlisted candidates. You have six-seven 🤷‍♂️ hours, including setup. 

We expect working code, evidence that you tested it and a clear explanation of your decisions. Use AI and existing libraries freely. You should understand and be able to explain everything you submit, including AI-generated code.

Submit when the time is up. Explain anything unfinished, why you prioritized other work, and what remains broken. 

## Setup and scope

Start from a basic Expo project. Build one chat screen and a simple subscription paywall, with a small local mock for chat and purchases. You don't need a production backend, store accounts or real payments. Include a reset action and simple controls for the failure cases below.

Choose iOS or Android for the demo and tell us the device or simulator and OS version. Include instructions for running the other platform and say whether you tested it. Use Expo development builds if your native dependencies need them. Existing native libraries are welcome; a custom Swift or Kotlin module is not required.

## Design

Use the Figma design https://www.figma.com/design/yEtnomNqQKGtO42UB0XJzY/FanSuite--React-Native-Task-?node-id=1-9&t=rCeQTCL6CGxNR6Pv-1 where it covers the screen. Design the missing offline, pending, failed and purchase states yourself. Keep them consistent with the screen. We care about readable status, keyboard handling, safe areas, accessible controls, transitions and small interactions. If the design link is unavailable, use a simple chat layout and note that in your submission.

[]()

### Required work

1. Keep messages safe

A send reaches the server, but the response is lost. The user retries and sees the message twice. Reproduce this with your mock, show what causes the duplicate and fix it. Include a test that fails for the broken behaviour and passes after your fix.

Persist pending messages before treating them as queued. Give each send a stable client ID that survives retries and app restarts. Your mock service must remember accepted client IDs and return the existing message when the same send is retried. Keep its accepted messages across app restarts, separately from the client's pending queue.

- Go offline and send three messages. Show each immediately with a clear waiting status.
- Force-quit or force-stop the app, then reopen it. All three must still be waiting.
- Simulate four incoming messages received while the client was offline. Reconnect, recover them and send the pending messages without duplicates.
- Simulate an accepted send with a lost response, then retry it. The final thread must contain one copy.
- Show failed sends clearly and preserve their text. Offer retry for recoverable failures; explain errors that need a different action.

Let the mock service assign the final message order. Keep queued outgoing messages in their local order until confirmed. Repeated responses must not add copies or make the thread keep jumping. Add a focused test for recovery after an app restart.

### 2. Handle payments and paid access

Build a simple paywall using a mock purchase service. Keep purchase results separate from the mock backend's confirmation of paid access. Label this as simulated billing.

- Show the product, price and purchase state clearly. Prevent repeated taps from starting duplicate purchase flows.
- Demonstrate purchase, cancellation, failure and restoration of an existing purchase.
- If a purchase succeeds while backend confirmation is pending, show that state honestly. Grant new access only when the mock backend confirms it.
- Repeated events must not create duplicate effects. Preserve access that is still valid when an unrelated purchase attempt fails.

Add a test for delayed confirmation. Briefly explain how you would connect this to store billing, validate purchases on the backend and handle subscription expiry or refunds. In the walkthrough, we'll ask about payments and paywalls you have shipped.

### 3. Make the screen pleasant and measure it

Generate a repeatable history of 50,000 short messages in the mock service and load it through pagination and a virtualized list. Keep scrolling and typing responsive. Design the failure states with the same care as the normal conversation. Use transitions and animations where they help, and respect reduced-motion settings.

Profile a repeatable scroll-and-type sequence on your chosen device or simulator. Record the build mode, frame timing or dropped frames, and memory use. Identify one bottleneck and show a measurement before and after a change using the same history and sequence. If your tools cannot measure something, say so rather than guessing. Simulator results are not proof of performance on a real phone.

## What to submit

Email join@fansapi.com a download link to Firstname_Lastname.zip. Include:

- Source, lockfile, setup instructions and the focused tests. We should be able to run the exercise locally without private credentials.
- A recording of the required scenarios on your chosen platform. Keep each recovery sequence uncut so we can follow it. Separate clips are fine.
- A short README covering the duplicate-message bug, decisions, test results, performance measurements, platform limitations and time spent.
- A short `AI.md` naming the tools you used, examples of output you checked or corrected, and anything you remain unsure about.

In a few sentences, explain how you would resume a large media upload after a network interruption or app restart. Distinguish backgrounding from the user force-quitting or force-stopping the app. You do not need to build an upload feature for this exercise.

Also identify the App Store and Google Play rules relevant to creator content and payments, with official links. Explain how they would affect the mobile app's scope.

## How we assess it

- Message correctness and recovery: 30%.
- Payments and paid-access handling: 25%.
- UI, interaction quality and measured performance: 30%.
- Debugging evidence, tests and explanation: 15%.

We review the submission, then have a 30-minute walkthrough. You'll reproduce a failure, explain the fix and talk through what you would check first if it happened to real users. Prioritize the required behaviour before adding screens or features.