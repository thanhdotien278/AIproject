const {
  buildThankyouViewModel,
  findRegisteredParticipant,
  formatConferenceDates,
} = require('../backend/services/thankyouViewModel');

describe('thank-you view model', () => {
  test('uses the just-registered participant and that participant conference fields', async () => {
    const participant = {
      _id: 'participant-a',
      id: 'participant-a',
      participantId: '0007',
      name: 'Nguyen Van A',
      email: 'same@example.com',
      phone: '0123456789',
      conferenceCode: 'CONF',
      targetAudience: 'Học viên',
    };
    const conference = {
      code: 'CONF',
      name: 'Correct Conference',
      startDate: new Date('2026-07-01T00:00:00.000Z'),
      endDate: new Date('2026-07-01T00:00:00.000Z'),
      registrationFields: ['name', 'email', 'phone', 'targetAudience'],
      location: {
        name: 'Main Hall',
        address: '123 Road',
      },
    };

    const Participant = {
      findById: jest.fn().mockResolvedValue(participant),
      findOne: jest.fn(),
    };
    const Conference = {
      findOne: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(conference),
      }),
    };

    const viewModel = await buildThankyouViewModel(
      {
        participantMongoId: 'participant-a',
        participantEmail: 'same@example.com',
        conferenceCode: 'CONF',
        participantId: '0007',
      },
      { Participant, Conference },
    );

    expect(Participant.findById).toHaveBeenCalledWith('participant-a');
    expect(Participant.findOne).not.toHaveBeenCalled();
    expect(Conference.findOne).toHaveBeenCalledWith({ code: 'CONF' });
    expect(viewModel.participant.targetAudience).toBe('Học viên');
    expect(viewModel.registrationFields).toContain('targetAudience');
    expect(viewModel.participantId).toBe('0007');
    expect(viewModel.conference.name).toBe('Correct Conference');
  });

  test('falls back to email plus conference code instead of email alone', async () => {
    const participant = {
      _id: 'participant-b',
      participantId: '0008',
      name: 'Tran Van B',
      email: 'same@example.com',
      conferenceCode: 'ABCD',
      targetAudience: 'Sĩ quan',
    };
    const conference = {
      code: 'ABCD',
      name: 'Fallback Conference',
      registrationFields: ['name', 'email', 'phone', 'targetAudience'],
    };

    const Participant = {
      findById: jest.fn(),
      findOne: jest.fn().mockResolvedValue(participant),
    };
    const Conference = {
      findOne: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(conference),
      }),
    };

    const viewModel = await buildThankyouViewModel(
      {
        participantEmail: 'same@example.com',
        conferenceCode: 'ABCD',
      },
      { Participant, Conference },
    );

    expect(Participant.findOne).toHaveBeenCalledWith({
      email: 'same@example.com',
      conferenceCode: 'ABCD',
    });
    expect(viewModel.participant.targetAudience).toBe('Sĩ quan');
    expect(viewModel.conference.code).toBe('ABCD');
  });

  test('falls back to session participant data when the persisted conference is unavailable', async () => {
    const Participant = {
      findById: jest.fn().mockResolvedValue(null),
      findOne: jest.fn().mockResolvedValue(null),
    };
    const Conference = {
      findOne: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      }),
    };

    const viewModel = await buildThankyouViewModel(
      {
        participantMongoId: 'missing-id',
        participantEmail: 'fallback@example.com',
        participantName: 'Fallback Name',
        conferenceCode: 'MISS',
        conferenceName: 'Session Conference',
        participantId: '0010',
        participantData: {
          participantId: '0010',
          name: 'Fallback Name',
          email: 'fallback@example.com',
          targetAudience: 'Viên chức quốc phòng',
        },
      },
      { Participant, Conference },
    );

    expect(Participant.findById).toHaveBeenCalledWith('missing-id');
    expect(Participant.findOne).toHaveBeenCalledWith({
      email: 'fallback@example.com',
      conferenceCode: 'MISS',
    });
    expect(viewModel.participant.targetAudience).toBe('Viên chức quốc phòng');
    expect(viewModel.conference).toEqual({ name: 'Session Conference', code: 'MISS' });
    expect(viewModel.registrationFields).toEqual(['name', 'email', 'phone']);
    expect(viewModel.locationName).toBeNull();
    expect(viewModel.qrData.participantName).toBe('Fallback Name');
  });

  test('uses default display values when no participant or conference keys exist', async () => {
    const Participant = {
      findById: jest.fn(),
      findOne: jest.fn(),
    };
    const Conference = {
      findOne: jest.fn(),
    };

    const viewModel = await buildThankyouViewModel({}, { Participant, Conference });

    expect(Participant.findById).not.toHaveBeenCalled();
    expect(Participant.findOne).not.toHaveBeenCalled();
    expect(Conference.findOne).not.toHaveBeenCalled();
    expect(viewModel.participant).toBeNull();
    expect(viewModel.conference).toEqual({ name: 'Hội Nghị', code: undefined });
    expect(viewModel.qrData).toEqual({
      conferenceCode: 'N/A',
      participantId: 'N/A',
      participantName: 'N/A',
    });
  });

  test('formats multi-day conference dates and missing dates', () => {
    expect(formatConferenceDates(null)).toBeNull();
    expect(formatConferenceDates({ startDate: new Date('2026-07-01T00:00:00.000Z') })).toBeNull();
    expect(formatConferenceDates({
      startDate: new Date('2026-07-01T00:00:00.000Z'),
      endDate: new Date('2026-07-02T00:00:00.000Z'),
    })).toContain(' - ');
  });

  test('returns null when participant lookup has no stable key', async () => {
    const Participant = {
      findById: jest.fn(),
      findOne: jest.fn(),
    };

    await expect(findRegisteredParticipant({}, Participant)).resolves.toBeNull();
    expect(Participant.findById).not.toHaveBeenCalled();
    expect(Participant.findOne).not.toHaveBeenCalled();
  });
});
