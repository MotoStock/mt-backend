import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShelfDto } from './dto/create-shelf.dto';
import { UpdateShelfDto } from './dto/update-shelf.dto';
import { Prisma } from '@prisma/client';

const MAX_DEPTH = 4;

/** Recursive include for loading children up to MAX_DEPTH levels */
function buildChildrenInclude(depth: number): any {
  if (depth <= 0) return false;
  return {
    include: {
      shelfItems: {
        include: { product: true },
        orderBy: { product: { name: 'asc' } },
      },
      children: buildChildrenInclude(depth - 1),
    },
    orderBy: { locationCode: 'asc' },
  };
}

@Injectable()
export class ShelfService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns only root shelves (parentId is null) with nested children */
  async findAll(params?: { page?: number; limit?: number; search?: string }) {
    const { page, limit, search } = params || {};

    const where: Prisma.ShelfWhereInput = { parentId: null };
    if (search) {
      where.OR = [
        { locationCode: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const include = {
      shelfItems: {
        include: { product: true },
        orderBy: { product: { name: 'asc' } as const },
      },
      children: buildChildrenInclude(MAX_DEPTH - 1),
    };

    const orderBy: Prisma.ShelfOrderByWithRelationInput = {
      locationCode: 'asc',
    };

    if (page !== undefined && limit !== undefined) {
      const skip = (page - 1) * limit;
      const [items, total] = await Promise.all([
        this.prisma.shelf.findMany({
          where,
          include,
          orderBy,
          skip,
          take: limit,
        }),
        this.prisma.shelf.count({ where }),
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

    return this.prisma.shelf.findMany({
      where,
      include,
      orderBy,
    });
  }

  /** Returns ALL shelves (flat list), useful for move-stock target selection */
  async findAllFlat(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const { page, limit, search } = params || {};

    const where: Prisma.ShelfWhereInput = search
      ? {
          OR: [
            { locationCode: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const include = {
      shelfItems: {
        include: { product: true },
        orderBy: { product: { name: 'asc' } as const },
      },
      parent: { select: { id: true, locationCode: true } },
    };

    const orderBy: Prisma.ShelfOrderByWithRelationInput = {
      locationCode: 'asc',
    };

    if (page !== undefined && limit !== undefined) {
      const skip = (page - 1) * limit;
      const [items, total] = await Promise.all([
        this.prisma.shelf.findMany({
          where,
          include,
          orderBy,
          skip,
          take: limit,
        }),
        this.prisma.shelf.count({ where }),
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

    return this.prisma.shelf.findMany({
      where,
      include,
      orderBy,
    });
  }

  async findOne(id: number) {
    const shelf = await this.prisma.shelf.findUnique({
      where: { id },
      include: {
        shelfItems: {
          include: { product: true },
          orderBy: { product: { name: 'asc' } },
        },
        children: buildChildrenInclude(MAX_DEPTH - 1),
        parent: { select: { id: true, locationCode: true } },
      },
    });
    if (!shelf) {
      throw new NotFoundException(`Estantería (ID: ${id}) no encontrada.`);
    }
    return shelf;
  }

  /** Get direct children of a shelf */
  async findChildren(parentId: number) {
    const parent = await this.prisma.shelf.findUnique({
      where: { id: parentId },
    });
    if (!parent) {
      throw new NotFoundException(
        `Estantería padre (ID: ${parentId}) no encontrada.`,
      );
    }
    return this.prisma.shelf.findMany({
      where: { parentId },
      include: {
        shelfItems: {
          include: { product: true },
          orderBy: { product: { name: 'asc' } },
        },
        children: { select: { id: true } }, // just to know if they have sub-children
      },
      orderBy: { locationCode: 'asc' },
    });
  }

  /** Calculate the depth of a given shelf (root = 1) */
  private async getDepth(shelfId: number): Promise<number> {
    let depth = 0;
    let currentId: number | null = shelfId;

    while (currentId !== null) {
      depth++;
      const shelf = await this.prisma.shelf.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });
      if (!shelf) break;
      currentId = shelf.parentId;
    }

    return depth;
  }

  /** Build the breadcrumb path from root to the given shelf */
  async getBreadcrumbs(
    shelfId: number,
  ): Promise<{ id: number; locationCode: string }[]> {
    const path: { id: number; locationCode: string }[] = [];
    let currentId: number | null = shelfId;

    while (currentId !== null) {
      const shelf = await this.prisma.shelf.findUnique({
        where: { id: currentId },
        select: { id: true, locationCode: true, parentId: true },
      });
      if (!shelf) break;
      path.unshift({ id: shelf.id, locationCode: shelf.locationCode });
      currentId = shelf.parentId;
    }

    return path;
  }

  /** Get recursive totals (own items + all descendants) */
  async getRecursiveTotals(
    shelfId: number,
  ): Promise<{ totalProducts: number; totalUnits: number }> {
    const shelf = await this.prisma.shelf.findUnique({
      where: { id: shelfId },
      include: {
        shelfItems: true,
        children: { select: { id: true } },
      },
    });

    if (!shelf) {
      throw new NotFoundException(`Estantería (ID: ${shelfId}) no encontrada.`);
    }

    let totalProducts = shelf.shelfItems.length;
    let totalUnits = shelf.shelfItems.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    for (const child of shelf.children) {
      const childTotals = await this.getRecursiveTotals(child.id);
      totalProducts += childTotals.totalProducts;
      totalUnits += childTotals.totalUnits;
    }

    return { totalProducts, totalUnits };
  }

  async create(dto: CreateShelfDto) {
    // Validate depth limit if creating a sub-shelf
    if (dto.parentId != null) {
      const parentDepth = await this.getDepth(dto.parentId);
      if (parentDepth >= MAX_DEPTH) {
        throw new BadRequestException(
          `No se pueden crear más de ${MAX_DEPTH} niveles de profundidad.`,
        );
      }

      // Verify parent exists
      const parent = await this.prisma.shelf.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException(
          `Estantería padre (ID: ${dto.parentId}) no encontrada.`,
        );
      }
    }

    try {
      return await this.prisma.shelf.create({
        data: {
          locationCode: dto.locationCode,
          description: dto.description,
          parentId: dto.parentId ?? null,
        },
        include: {
          shelfItems: {
            include: { product: true },
          },
          children: true,
          parent: { select: { id: true, locationCode: true } },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Ya existe una estantería con el código "${dto.locationCode}".`,
        );
      }
      throw error;
    }
  }

  async update(id: number, dto: UpdateShelfDto) {
    try {
      return await this.prisma.shelf.update({ where: { id }, data: dto });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Estantería (ID: ${id}) no encontrada.`);
        }
        if (error.code === 'P2002') {
          throw new ConflictException(
            `Ya existe una estantería con el código "${dto.locationCode}".`,
          );
        }
      }
      throw error;
    }
  }

  async remove(id: number) {
    try {
      return await this.prisma.shelf.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Estantería (ID: ${id}) no encontrada.`);
      }
      throw error;
    }
  }

  /**
   * Delete a shelf but move all its products (and its descendants' products)
   * to the parent shelf first. If no parent → products are lost (use regular remove).
   */
  async removeAndReassign(id: number) {
    const shelf = await this.prisma.shelf.findUnique({
      where: { id },
      select: { id: true, parentId: true },
    });
    if (!shelf) {
      throw new NotFoundException(`Estantería (ID: ${id}) no encontrada.`);
    }
    if (!shelf.parentId) {
      throw new BadRequestException(
        'No se pueden reasignar productos de una estantería raíz (no tiene padre).',
      );
    }

    const parentId = shelf.parentId;

    // Collect ALL descendant shelf IDs (including self) via recursion
    const descendantIds = await this.getDescendantIds(id);

    return this.prisma.$transaction(async (tx) => {
      // Get all shelf items across this shelf and all descendants
      const items = await tx.shelfItem.findMany({
        where: { shelfId: { in: descendantIds } },
      });

      // Upsert each product into the parent shelf
      for (const item of items) {
        await tx.shelfItem.upsert({
          where: {
            shelfId_productId: {
              shelfId: parentId,
              productId: item.productId,
            },
          },
          update: { quantity: { increment: item.quantity } },
          create: {
            shelfId: parentId,
            productId: item.productId,
            quantity: item.quantity,
          },
        });
      }

      // Delete the shelf (cascade deletes children and their shelfItems)
      await tx.shelf.delete({ where: { id } });

      return {
        message: `Cajón eliminado. ${items.length} productos movidos al estante padre.`,
        movedItems: items.length,
      };
    });
  }

  /** Get all descendant shelf IDs including the given shelfId */
  private async getDescendantIds(shelfId: number): Promise<number[]> {
    const ids = [shelfId];
    const children = await this.prisma.shelf.findMany({
      where: { parentId: shelfId },
      select: { id: true },
    });
    for (const child of children) {
      const childIds = await this.getDescendantIds(child.id);
      ids.push(...childIds);
    }
    return ids;
  }
}
