import { User } from "../db";
import { BaseRepository } from "../db/repositories/base.repository";

export class UserService {
  private users = new BaseRepository(User);

  async findByAuthId(authUserId: string) {
    return this.users.findOne({ where: { auth_user_id: authUserId } });
  }

  async findByAuthIdWithOrgs(authUserId: string) {
    return this.users.findOne({
      where: { auth_user_id: authUserId },
      relations: ["organization_memberships", "organization_memberships.organization"],
    });
  }

  async findByAuthIdWithCurrentOrg(authUserId: string) {
    return this.users.findOne({
      where: { auth_user_id: authUserId },
      relations: ["current_organization"],
    });
  }

  async findById(id: number) {
    return this.users.findById(id);
  }

  async findByUuid(uuid: string) {
    return this.users.findByUuid(uuid);
  }

  async findByEmail(email: string) {
    return this.users.findOne({ where: { email } });
  }

  async create(data: {
    auth_user_id: string;
    email: string;
    first_name: string;
    last_name: string;
    display_name: string;
    avatar_url?: string | null;
  }) {
    return this.users.create(data);
  }

  async update(id: number, data: Partial<User>, updatedBy?: number) {
    return this.users.update(id, data, updatedBy);
  }

  async setCurrentOrganization(userId: number, organizationId: number) {
    return this.users.update(userId, { current_organization_id: organizationId }, userId);
  }

  async completeOnboarding(id: number) {
    return this.users.update(id, { onboarding_completed: true }, id);
  }

  async activate(id: number, activatedBy: number) {
    return this.users.update(
      id,
      { activated_flag: true, activated_on: new Date(), activated_by: activatedBy },
      activatedBy
    );
  }

  async delete(id: number, deletedBy?: number) {
    return this.users.softDelete(id, deletedBy);
  }
}
