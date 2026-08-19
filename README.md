# ARTFIQ Workspace Hub

🚀 The Ultimate "ARTFIQ Workspace" Prompt
(Copy this and paste it into v0.dev or Bolt.new for the best result)

Act as a Senior Full-Stack Developer. Build a complete Single Page Application (SPA) called "ARTFIQ Workspace" using React, Tailwind CSS, and Firebase.

1. Theme & UI:

Visual Style: Deep Dark Mode (#0a0a0a), Cyber-Tech aesthetic.

Accents: Cyan (#00d2ff) for interactive elements, Red (#ff3b30) for alerts.

Layout: A sidebar navigation (on desktop) / bottom tab bar (on mobile) switching between 3 Tabs: Home (About), Vault (Files), and Team Chat.

2. Feature: Authentication (Google Login):

The app must have a "Login Screen" if the user is not authenticated.

Use a "Sign in with Google" button.

Once logged in, show the User's Profile Picture and Name in the top right corner.

Simulate the Firebase Auth logic if a real backend isn't available, but write the code structure as if it's connecting to Firebase.

3. Feature: Document Vault (Storage):

Upload Area: A drag-and-drop zone for PDF files.

Constraint: Implement Strict Validation to reject files larger than 10MB. Show an error toast message: "File too large! Max limit 10MB."

List View: Show uploaded files with Icon, File Name, Size, uploader's name, and a "Download" button.

4. Feature: Real-Time Team Chat:

Interface: A chat interface similar to Slack/WhatsApp Web (Dark Mode).

Messages: Each message should show the User Avatar, Name, Timestamp, and Message Text.

Input: A text box at the bottom with a "Send" button (Cyan color).

5. Feature: About ARTFIQ:

Display the company details:

Mission: "Bridging human needs with digital efficiency."

Founders: Show cards for "Mohammed Sulaiman (CEO)" and "Mohammed Anas (CTO)".

Technical Requirements:

Use lucide-react for icons.

Use framer-motion for smooth page transitions.

Make it fully responsive (Mobile & Desktop friendly).

Ensure the Code is modular.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://artfiqinnov.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8225e108-c20c-4c58-9636-36aade2d331e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
