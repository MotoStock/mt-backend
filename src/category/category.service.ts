import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException(`Categoría (ID: ${id}) no encontrada.`);
    }
    return category;
  }

  async create(dto: CreateCategoryDto) {
    try {
      return await this.prisma.category.create({
        data: dto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`Ya existe una categoría con el nombre "${dto.name}".`);
      }
      throw error;
    }
  }

  async update(id: number, dto: UpdateCategoryDto) {
    try {
      return await this.prisma.category.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Categoría (ID: ${id}) no encontrada.`);
        }
        if (error.code === 'P2002') {
          throw new ConflictException(`Ya existe una categoría con el nombre "${dto.name}".`);
        }
      }
      throw error;
    }
  }

  async remove(id: number) {
    try {
      return await this.prisma.category.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Categoría (ID: ${id}) no encontrada.`);
      }
      throw error;
    }
  }
}
