import { AdminUserModel, type AdminUserDocument } from "@/modules/auth/auth.model";
import type { Role } from "@tribastion/shared";

export const authRepository = {
  findByEmail(email: string): Promise<AdminUserDocument | null> {
    return AdminUserModel.findOne({ email: email.toLowerCase() }).select("+passwordHash +mfaSecret").exec();
  },

  findById(id: string): Promise<AdminUserDocument | null> {
    return AdminUserModel.findById(id).exec();
  },

  findByIdWithSecrets(id: string): Promise<AdminUserDocument | null> {
    return AdminUserModel.findById(id).select("+passwordHash +mfaSecret").exec();
  },

  create(data: { email: string; name: string; passwordHash: string; role: Role }): Promise<AdminUserDocument> {
    return AdminUserModel.create(data);
  },

  countAll(): Promise<number> {
    return AdminUserModel.countDocuments().exec();
  },
};
