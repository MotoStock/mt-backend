import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: number;
  }) {
    const { page, limit, search, categoryId } = params || {};

    const where: Prisma.ProductWhereInput = {
      AND: [
        search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {},
        categoryId
          ? {
              categories: {
                some: { id: categoryId },
              },
            }
          : {},
      ],
    };

    const include = {
      shelfItems: { include: { shelf: true } },
      categories: true,
    };
    const orderBy: Prisma.ProductOrderByWithRelationInput = { name: 'asc' };

    if (page !== undefined && limit !== undefined) {
      const skip = (page - 1) * limit;
      const [items, total] = await Promise.all([
        this.prisma.product.findMany({
          where,
          include,
          orderBy,
          skip,
          take: limit,
        }),
        this.prisma.product.count({ where }),
      ]);
      return {
        data: items,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    return this.prisma.product.findMany({
      where,
      include,
      orderBy,
    });
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        shelfItems: { include: { shelf: true } },
        categories: true,
      },
    });
    if (!product) {
      throw new NotFoundException(`Producto (ID: ${id}) no encontrado.`);
    }
    return product;
  }

  async create(dto: CreateProductDto) {
    try {
      const { categoryIds, ...rest } = dto;
      const data: Prisma.ProductCreateInput = {
        ...rest,
        sku: dto.sku && dto.sku.trim() !== '' ? dto.sku : null,
        categories:
          categoryIds && categoryIds.length > 0
            ? {
                connect: categoryIds.map((id) => ({ id })),
              }
            : undefined,
      };
      return await this.prisma.product.create({
        data,
        include: { categories: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Ya existe un producto con el SKU "${dto.sku}".`,
        );
      }
      throw error;
    }
  }

  async update(id: number, dto: UpdateProductDto) {
    try {
      const { categoryIds, ...rest } = dto;
      const data: Prisma.ProductUpdateInput = {
        ...rest,
      };

      if (dto.sku !== undefined) {
        data.sku = dto.sku && dto.sku.trim() !== '' ? dto.sku : null;
      }

      if (categoryIds !== undefined) {
        data.categories = {
          set: categoryIds.map((id) => ({ id })),
        };
      }

      return await this.prisma.product.update({
        where: { id },
        data,
        include: { categories: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Producto (ID: ${id}) no encontrado.`);
        }
        if (error.code === 'P2002') {
          throw new ConflictException(
            `Ya existe un producto con el SKU "${dto.sku}".`,
          );
        }
      }
      throw error;
    }
  }

  async remove(id: number) {
    try {
      return await this.prisma.product.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Producto (ID: ${id}) no encontrado.`);
      }
      throw error;
    }
  }
}
