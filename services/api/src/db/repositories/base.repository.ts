import {
  Repository,
  type FindManyOptions,
  type FindOneOptions,
  type DeepPartial,
  type FindOptionsWhere,
  type ObjectLiteral,
} from "typeorm";
import { AppDataSource } from "../data-source";
import type { BaseEntity } from "../entities/base.entity";

export class BaseRepository<T extends BaseEntity & ObjectLiteral> {
  protected repository: Repository<T>;

  constructor(entityClass: new () => T) {
    this.repository = AppDataSource.getRepository(entityClass);
  }

  async findAll(options?: FindManyOptions<T>): Promise<T[]> {
    return this.repository.find({
      ...options,
      where: {
        ...(options?.where as FindOptionsWhere<T>),
        deleted_flag: false,
      } as FindOptionsWhere<T>,
    });
  }

  async findOne(options: FindOneOptions<T>): Promise<T | null> {
    return this.repository.findOne({
      ...options,
      where: {
        ...(options.where as FindOptionsWhere<T>),
        deleted_flag: false,
      } as FindOptionsWhere<T>,
    });
  }

  async findById(id: number): Promise<T | null> {
    return this.repository.findOne({
      where: { id, deleted_flag: false } as FindOptionsWhere<T>,
    });
  }

  async findByUuid(uuid: string): Promise<T | null> {
    return this.repository.findOne({
      where: { uuid, deleted_flag: false } as FindOptionsWhere<T>,
    });
  }

  async create(data: DeepPartial<T>, userId?: number): Promise<T> {
    const entity = this.repository.create({
      ...data,
      created_by: userId,
      updated_by: userId,
    } as DeepPartial<T>);
    return this.repository.save(entity);
  }

  async update(id: number, data: DeepPartial<T>, userId?: number): Promise<T | null> {
    const entity = await this.findById(id);
    if (!entity) return null;

    Object.assign(entity, data, { updated_by: userId });
    return this.repository.save(entity);
  }

  async softDelete(id: number, userId?: number): Promise<boolean> {
    const entity = await this.findById(id);
    if (!entity) return false;

    entity.deleted_flag = true;
    entity.deleted_on = new Date();
    entity.deleted_by = userId ?? null;
    await this.repository.save(entity);
    return true;
  }

  async restore(id: number, userId?: number): Promise<T | null> {
    const entity = await this.repository.findOne({
      where: { id, deleted_flag: true } as FindOptionsWhere<T>,
    });
    if (!entity) return null;

    entity.deleted_flag = false;
    entity.deleted_on = null;
    entity.deleted_by = null;
    entity.updated_by = userId ?? null;
    return this.repository.save(entity);
  }

  async count(options?: FindManyOptions<T>): Promise<number> {
    let where: FindOptionsWhere<T> | FindOptionsWhere<T>[];

    if (Array.isArray(options?.where)) {
      where = options.where.map((w) => ({
        ...w,
        deleted_flag: false,
      })) as FindOptionsWhere<T>[];
    } else {
      where = {
        ...(options?.where as FindOptionsWhere<T>),
        deleted_flag: false,
      } as FindOptionsWhere<T>;
    }

    return this.repository.count({ ...options, where });
  }

  async exists(where: FindOptionsWhere<T>): Promise<boolean> {
    const count = await this.repository.count({
      where: { ...where, deleted_flag: false } as FindOptionsWhere<T>,
    });
    return count > 0;
  }
}
