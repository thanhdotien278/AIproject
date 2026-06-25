# Data Models

## Participant

File: `backend/models/Participant.js`

Stores a participant registration.

Key fields:

- `name`, `email`, `phone`
- `rank`, `academic`, `position`, `speciality`, `workunit`
- `role`, `targetAudience`
- logistics booleans: `speech`, `transport`, `lunch`, `dinner`, `qime`
- free text: `feedback`, `questions`, `source`, `mostinterested`
- `conferenceCode`: required 4-character uppercase event code
- `registrationDate`: defaults to now
- `registrationTime`: explicit registration timestamp set by controller
- `emailSent`: confirmation state
- `attendance`: boolean, default false
- `participantId`: required 4-character ID, currently globally unique

Important issue: `participantId` is intended to be per-conference, but the schema sets `unique: true` on `participantId` alone. That conflicts with the intended design where every conference can have participant `0001`.

## Conference

File: `backend/models/Conference.js`

Stores an event configuration.

Key fields:

- `code`: required unique uppercase 4-character code
- `name`, `isActive`, `startDate`, `endDate`, `time`
- `location`: required `Location` reference
- contact fields: `contactName`, `contactPhone`, `contactEmail`
- speaker fields: `mainSpeaker`, `speakersName`, `speakerBio`, `speakerBusiness`
- `maxAttendees`
- `description`
- `targetAudience`: enum array
- `registrationFields`: enum array controlling the registration form
- `createdAt`, `updatedAt`

The controller guarantees `name`, `email`, and `phone` are included in `registrationFields` when creating/updating a conference.

## Counter

File: `backend/models/Counter.js`

Stores atomic participant sequences per conference.

- `_id`: `participants_<CONFCODE>`
- `sequence_value`: latest issued sequence

`Counter.getNextSequenceValue(conferenceCode)` uses `findOneAndUpdate` with `$inc` and `upsert` to avoid duplicate sequence numbers under concurrent registration.

## Location

File: `backend/models/Location.js`

Stores venue information.

- `name`: required unique
- `address`
- `capacity`
- `createdAt`, `updatedAt`

## User

File: `backend/models/User.js`

Stores admin/system accounts.

- `username`: required unique
- `password`: bcrypt-hashed in a pre-save hook
- `fullName`, `email`, `bio`, `userPhone`, `shortBio`
- `userRole`: enum `admin`, `manager`, `staff`, `receptionist`, `user`
- `isAdmin`

The current route layer checks only `req.session.isAuthenticated`; it does not enforce `userRole` permissions.

## Speaker

File: `backend/models/Speaker.js`

Stores speaker profile data including `speakerID`, `fullName`, contact details, rank/academic/position/speciality, speech title/time, and uploaded avatar URL.
