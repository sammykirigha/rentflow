import { DeepPartial, FindManyOptions, FindOneOptions, FindOptionsWhere, Repository } from 'typeorm';

export abstract class AbstractRepository<T> {
  constructor(protected readonly repository: Repository<T>) { }

  async create(data: DeepPartial<T>): Promise<T> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async findOne(options: FindOneOptions<T>): Promise<T | null> {
    return this.repository.findOne(options);
  }

  async findAll(options?: FindManyOptions<T>): Promise<T[]> {
    return this.repository.find(options as FindManyOptions<T>);
  }

  async findAndCount(where?: FindManyOptions<T>): Promise<[T[], number]> {
    if (!where) return this.repository.findAndCount();
    return this.repository.findAndCount(where as FindManyOptions<T>);
  }

  async update(criteria: FindOptionsWhere<T>, update: DeepPartial<T>): Promise<T | null> {
    await this.repository.update(criteria as any, update as any);
    return this.findOne({ where: criteria });
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async deleteByCriteria(criteria: FindOptionsWhere<T>): Promise<void> {
    await this.repository.delete(criteria);
  }

  async save(entity: T): Promise<T> {
    return this.repository.save(entity);
  }
}
