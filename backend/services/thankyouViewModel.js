const mongoose = require('mongoose');

const DEFAULT_REGISTRATION_FIELDS = ['name', 'email', 'phone'];

function formatConferenceDates(conference) {
  if (!conference || !conference.startDate || !conference.endDate) return null;

  const startDate = new Date(conference.startDate);
  const endDate = new Date(conference.endDate);
  const formatOptions = { year: 'numeric', month: 'long', day: 'numeric' };

  let formattedDates = startDate.toLocaleDateString('vi-VN', formatOptions);
  if (startDate.getTime() !== endDate.getTime()) {
    formattedDates += ` - ${endDate.toLocaleDateString('vi-VN', formatOptions)}`;
  }

  return formattedDates;
}

async function findRegisteredParticipant(session, Participant = mongoose.model('Participant')) {
  if (session.participantMongoId) {
    const participant = await Participant.findById(session.participantMongoId);
    if (participant) return participant;
  }

  if (session.participantEmail && session.conferenceCode) {
    return Participant.findOne({
      email: session.participantEmail,
      conferenceCode: session.conferenceCode,
    });
  }

  return null;
}

async function findRegisteredConference(session, participant, Conference = mongoose.model('Conference')) {
  const conferenceCode = participant?.conferenceCode || session.conferenceCode;
  if (!conferenceCode) return null;

  return Conference.findOne({ code: conferenceCode }).populate('location');
}

async function buildThankyouViewModel(session, models = {}) {
  const Participant = models.Participant || mongoose.model('Participant');
  const Conference = models.Conference || mongoose.model('Conference');

  const participantName = session.participantName;
  const participantEmail = session.participantEmail;
  const conferenceName = session.conferenceName;
  const conferenceCode = session.conferenceCode;
  const participantData = session.participantData;

  const participant = await findRegisteredParticipant(session, Participant);
  const conference = await findRegisteredConference(session, participant, Conference);
  const resolvedParticipant = participant || participantData || null;
  const resolvedConference = conference || { name: conferenceName || 'Hội Nghị', code: conferenceCode };

  return {
    participantName,
    participantEmail,
    participant: resolvedParticipant,
    participantId: resolvedParticipant?.participantId || session.participantId,
    conference: resolvedConference,
    formattedDates: formatConferenceDates(conference),
    locationName: conference?.location ? conference.location.name : (conference ? 'Sẽ được thông báo sau' : null),
    locationAddress: conference?.location ? conference.location.address : '',
    qrData: {
      conferenceCode: resolvedConference?.code || 'N/A',
      participantId: resolvedParticipant ? (resolvedParticipant.id || resolvedParticipant._id || resolvedParticipant.participantId) : 'N/A',
      participantName: resolvedParticipant?.name || participantName || 'N/A',
    },
    registrationFields: conference
      ? (conference.registrationFields || DEFAULT_REGISTRATION_FIELDS)
      : DEFAULT_REGISTRATION_FIELDS,
  };
}

module.exports = {
  buildThankyouViewModel,
  formatConferenceDates,
  findRegisteredParticipant,
  findRegisteredConference,
};
