import { AppDataSource, Organization, OrganizationMember } from "../db";
import { BaseRepository } from "../db/repositories/base.repository";
import type { OrgRole } from "../db/entities/organization-member.entity";

export class OrganizationService {
  private organizations = new BaseRepository(Organization);
  private members = new BaseRepository(OrganizationMember);

  async findById(id: number) {
    return this.organizations.findById(id);
  }

  async findByUuid(uuid: string) {
    return this.organizations.findByUuid(uuid);
  }

  async findBySlug(slug: string) {
    return this.organizations.findOne({ where: { slug } });
  }

  async findAllByUserId(userId: number) {
    const memberships = await AppDataSource.getRepository(OrganizationMember).find({
      where: { user_id: userId, deleted_flag: false },
      relations: ["organization"],
    });

    return memberships
      .filter((m) => !m.organization.deleted_flag)
      .map((m) => ({ ...m.organization, role: m.role, joined_at: m.joined_at }));
  }

  async create(
    data: { name: string; slug: string; logo_url?: string | null; is_personal?: boolean },
    ownerId: number
  ) {
    const org = await this.organizations.create(
      { ...data, plan: "free", is_personal: data.is_personal ?? false },
      ownerId
    );

    await this.members.create(
      {
        organization_id: org.id,
        user_id: ownerId,
        role: "owner" as OrgRole,
        joined_at: new Date(),
        status: "active",
      },
      ownerId
    );

    return org;
  }

  async update(id: number, data: Partial<Organization>, updatedBy?: number) {
    return this.organizations.update(id, data, updatedBy);
  }

  async delete(id: number, deletedBy?: number) {
    return this.organizations.softDelete(id, deletedBy);
  }

  async getMembership(orgId: number, userId: number) {
    return AppDataSource.getRepository(OrganizationMember).findOne({
      where: { organization_id: orgId, user_id: userId, deleted_flag: false },
    });
  }

  async getMembershipWithOrg(orgId: number, userId: number) {
    return AppDataSource.getRepository(OrganizationMember).findOne({
      where: { organization_id: orgId, user_id: userId, deleted_flag: false },
      relations: ["organization"],
    });
  }

  async getMembers(orgId: number) {
    return AppDataSource.getRepository(OrganizationMember).find({
      where: { organization_id: orgId, deleted_flag: false },
      relations: ["user"],
    });
  }

  async addMember(orgId: number, userId: number, role: OrgRole, invitedBy: number) {
    return this.members.create(
      {
        organization_id: orgId,
        user_id: userId,
        role,
        invited_by: invitedBy,
        invited_at: new Date(),
        status: "pending",
      },
      invitedBy
    );
  }

  async updateMemberRole(orgId: number, userId: number, role: OrgRole, updatedBy: number) {
    const membership = await this.getMembership(orgId, userId);
    if (!membership) return null;
    return this.members.update(membership.id, { role }, updatedBy);
  }

  async removeMember(orgId: number, userId: number, removedBy: number) {
    const membership = await this.getMembership(orgId, userId);
    if (!membership) return false;
    return this.members.softDelete(membership.id, removedBy);
  }

  hasPermission(role: string, requiredRoles: string[]): boolean {
    return requiredRoles.includes(role);
  }
}
