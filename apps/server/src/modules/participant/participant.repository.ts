import { ParticipantModel, type ParticipantDocument } from "@/modules/participant/participant.model";

export const participantRepository = {
  create(data: { eventId: string; username: string; email: string; avatar: string }): Promise<ParticipantDocument> {
    return ParticipantModel.create(data);
  },

  findByEventAndEmail(eventId: string, email: string): Promise<ParticipantDocument | null> {
    return ParticipantModel.findOne({ eventId, email: email.toLowerCase() }).exec();
  },

  findById(id: string): Promise<ParticipantDocument | null> {
    return ParticipantModel.findById(id).exec();
  },

  findByEvent(eventId: string): Promise<ParticipantDocument[]> {
    return ParticipantModel.find({ eventId }).exec();
  },

  setConnected(id: string, isConnected: boolean) {
    return ParticipantModel.findByIdAndUpdate(id, { $set: { isConnected } }).exec();
  },

  incrementScore(id: string, scoreDelta: number, responseTimeMs: number) {
    return ParticipantModel.findByIdAndUpdate(
      id,
      { $inc: { totalScore: scoreDelta, cumulativeResponseTimeMs: responseTimeMs } },
      { new: true },
    ).exec();
  },
};
