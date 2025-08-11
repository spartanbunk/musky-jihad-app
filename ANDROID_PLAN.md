Your Role
You are an expert Android developer specializing in creating location-aware applications with deep Google Assistant integration.

My Goal
I have an existing web application with a Next.js and Postgres backend. I need to create a native Android application to serve as a mobile client. The primary objective is to build a minimal viable product (MVP) that implements a core, hands-free, voice-activated feature: "Hey Google, Mark a fish."

Core Feature Breakdown
Voice Command: The user says, "Hey Google, Mark a fish."

Action: Google Assistant launches my Android app directly.

Location Capture: The app immediately captures the device's current, precise GPS coordinates. This must be reliable even if the app is in the background or the phone is locked.

User Input: The app then presents a simple screen showing the captured location on a map and allows the user to input additional details about the catch (e.g., species, weight).

Data Submission: The user saves the details, and the app sends all the information (coordinates + details) to my existing backend via a REST API POST request.

Your Task
Generate the complete, well-structured plan for an Android Studio project using Kotlin that accomplishes these requirements. Please provide the full code for each necessary file, including Gradle dependencies, manifest configurations, XML resources, and all Kotlin classes.

Detailed Technical Specifications
1. Project Setup (build.gradle.kts)
Include dependencies for:

Google Play Services Location (play-services-location) for the Fused Location Provider.

Google Play Services Maps (play-services-maps) for the Maps SDK.

Retrofit2 and a JSON converter (like Gson or Moshi) for networking.

2. Android Manifest (AndroidManifest.xml)
Declare all necessary permissions: INTERNET, ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION, and ACCESS_BACKGROUND_LOCATION.

Include the <meta-data> tag within the main <activity> to reference the shortcuts.xml file for App Actions.    

3. Google Assistant Integration (App Actions)
res/xml/shortcuts.xml
Create this file to define an App Actions <capability>.

Use a Custom Intent with the name custom.actions.intent.MARK_FISH. This is critical; do not use a built-in intent.    

Configure the <intent> to launch a specific Activity in the app (e.g., MainActivity).

res/values/strings.xml
Create a <string-array> resource that contains the query patterns for the custom intent.    

Include phrases like "Mark a fish" and "Log a new catch."

Link this array to the capability in shortcuts.xml.

4. Application Logic (Kotlin Classes)
MainActivity.kt
This activity should be the entry point for the App Action.

In its onCreate or onNewIntent method, it must check if it was launched by the custom.actions.intent.MARK_FISH intent.

It must handle the runtime permission requests for ACCESS_FINE_LOCATION and ACCESS_BACKGROUND_LOCATION, providing a clear rationale to the user for why background access is needed for the hands-free feature.    

Upon receiving the intent and having permissions, it should immediately trigger the location capture.

LocationService.kt (or similar utility)
Implement the logic using the Fused Location Provider API.

Provide a function to get the current location immediately. It should prioritize a fresh, high-accuracy location using getCurrentLocation() but can use getLastLocation() as a quick first attempt. remember we are marking where the fish bit.   

AddCatchActivity.kt
After location is captured, this activity should be launched.

It must mark on the google map the location of the fish as if a normal manual entry would happen

Include a MapView or SupportMapFragment centered on the captured coordinates with a marker.

Provide our existing edit structure along with the captured data

After user enter data they can save 

CatchData.kt
A Kotlin data class representing the JSON payload to be sent to the backend (e.g., latitude: Double, longitude: Double, species: String).

ApiService.kt
A Retrofit interface defining the POST request to a placeholder endpoint (e.g., POST /api/catches).

NetworkClient.kt
A singleton or helper class to create and configure the Retrofit instance.

Please structure your response with clear file paths and the complete code for each file to ensure I can quickly and efficiently assemble this project.

analyze this prompt, punch holes in it..just make a bullet proof plan to implement my android phone app
