
# Akeshya - Train PNR Status App

## Purpose of the App

The Akeshya - Train PNR Status App is a React Native application designed to help users quickly check train details using their Passenger Name Record (PNR) number. This app aims to provide a simple and efficient way to track train status, including train name, current location, estimated arrival time, and seat details. It also supports detecting PNR numbers from incoming SMS messages on Android devices, making it highly convenient for users on the go.

## Features

- **PNR Search**: Manually enter a 10-digit PNR to fetch train details.
- **Fetch PNR from SMS (Android Only)**: Automatically detect PNR numbers from incoming SMS messages.
- **Real-time Updates**: Continuously poll for updated train details every second.
- **Train Details Display**:
  - Train Name
  - Current Location
  - Estimated Arrival
  - Seat Details
- **Input Validation**: Ensures that only valid 10-digit PNRs are processed.
- **Error Handling**:
  - Invalid PNR
  - Missing Train Details
  - Permission Denied for SMS Access

## Steps for Running the Project

### 1. Clone the Repository

First, clone the repository to your local machine:

```
git clone <repository-url>
cd <repository-folder>
```

### 2. Install Dependencies

Install all necessary dependencies by running the following command:

```
npm install
```

### 3. Install React Native Dependencies

Install libraries required for the app to function correctly, including the dependencies used in Home.tsx:

```
npm run install-dependencies
```

### 4. iOS Setup (Optional - MacOS Only)

If you are developing for iOS on MacOS, install CocoaPods dependencies:

```
npm run install-pods
```

### 5. Start the Metro Server

Start the Metro server (used to bundle JavaScript for the app):

```
npm run start
```

### 6. Run the App

- **For Android**:

```
npm run android
```

- **For iOS (MacOS only)**:

```
npm run ios
```
