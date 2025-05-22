# Participant ID System

## Overview

This document describes the participant ID generation system used in the conference registration application. Participant IDs are 4-digit strings (e.g., "0001", "0002") that uniquely identify participants *within each conference*.

## Key Features

1. **Conference-specific IDs**: Each conference has its own independent sequence of participant IDs.
2. **Concurrency-safe**: The system uses MongoDB atomic operations to prevent duplicate IDs during concurrent registrations.
3. **Predictable formatting**: IDs are 4-digit strings padded with leading zeros.

## Technical Implementation

### Counter Model

The system uses a `Counter` model (`backend/models/Counter.js`) to maintain an atomic counter for each conference:

- Each counter document has an ID in the format `participants_CONFCODE` (e.g., `participants_CONF`).
- The document stores a `sequence_value` that tracks the latest ID number issued.
- The `getNextSequenceValue` method atomically increments and returns the next sequence value.

### ID Generation Process

When a participant registers:

1. The system reads which conference they're registering for (e.g., "CONF").
2. It calls `Counter.getNextSequenceValue("CONF")`, which:
   - Finds or creates a counter document with ID `participants_CONF`
   - Atomically increments the `sequence_value` field and returns the new value
3. The returned value is padded with leading zeros to form a 4-digit string (e.g., "0013").
4. This ID is stored in the participant's record as `participantId`.

### Migration

If you need to rebuild all participant IDs (e.g., after changing the ID system), run:

```
node backend/migrations/updateParticipantIdsByConference.js
```

This script:
1. Groups participants by conference
2. For each conference:
   - Sorts participants by registration date
   - Assigns sequential IDs starting from "0001"
   - Updates the counter for that conference

## Display

The participant ID is displayed:
1. On the "Thank You" page after registration
2. In confirmation emails
3. In the admin dashboard
4. In exported reports

## Benefits

- **Clarity**: Users get short, easy-to-read IDs.
- **Per-conference namespacing**: IDs start from "0001" for each conference, making them easier to track.
- **Reliability**: The atomic counter approach prevents duplicate IDs even under heavy concurrent load.
- **Scalability**: The system works efficiently regardless of the number of participants or conferences. 