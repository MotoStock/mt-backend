import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MoveStockDto } from './dto/move-stock.dto';
import { AddStockDto } from './dto/add-stock.dto';
import { MoveStockBatchDto } from './dto/move-stock-batch.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { ConsolidateProductDto } from './dto/consolidate-product.dto';

export interface ConsolidationSuggestion {
  productId: number;
  productName: string;
  sku: string | null;
  totalQuantity: number;
  locations: {
    shelfId: number;
    locationCode: string;
    quantity: number;
  }[];
  message: string;
}

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Consolidates all stock of a product from all its current locations into a single target shelf.
   */
  async consolidateProduct(dto: ConsolidateProductDto) {
    const { productId, targetShelfId } = dto;

    // Validate target shelf exists
    const targetShelf = await this.prisma.shelf.findUnique({
      where: { id: targetShelfId },
    });
    if (!targetShelf) {
      throw new NotFoundException(`Estantería destino (ID: ${targetShelfId}) no encontrada.`);
    }

    // Validate product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Producto (ID: ${productId}) no encontrado.`);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Get all current locations for this product
      const items = await tx.shelfItem.findMany({
        where: { productId },
      });

      if (items.length === 0) {
        throw new BadRequestException(`El producto "${product.name}" no tiene existencias en ninguna estantería.`);
      }

      // 2. Sum up total quantity
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

      // 3. Delete all existing shelf items for this product
      await tx.shelfItem.deleteMany({
        where: { productId },
      });

      // 4. Create single shelf item at target
      const consolidatedItem = await tx.shelfItem.create({
        data: {
          productId,
          shelfId: targetShelfId,
          quantity: totalQuantity,
        },
        include: { shelf: true },
      });

      return {
        message: `Se han consolidado ${totalQuantity} unidades de "${product.name}" en la estantería "${consolidatedItem.shelf.locationCode}".`,
        totalQuantity,
        targetShelfId,
        productId,
      };
    });
  }

  /**
   * Moves stock of a product from one shelf to another inside a Prisma transaction.
   * - Validates sufficient stock in source shelf.
   * - Decrements source (deletes record if quantity reaches 0).
   * - Upserts target (creates or increments).
   */
  async moveStock(dto: MoveStockDto) {
    const { productId, sourceShelfId, targetShelfId, amount } = dto;

    if (sourceShelfId === targetShelfId) {
      throw new BadRequestException(
        'La estantería de origen y destino no pueden ser la misma.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Verify source shelf item exists and has enough stock
      const sourceItem = await tx.shelfItem.findUnique({
        where: {
          shelfId_productId: { shelfId: sourceShelfId, productId },
        },
      });

      if (!sourceItem) {
        throw new NotFoundException(
          `El producto (ID: ${productId}) no se encuentra en la estantería origen (ID: ${sourceShelfId}).`,
        );
      }

      if (sourceItem.quantity < amount) {
        throw new BadRequestException(
          `Stock insuficiente. Disponible: ${sourceItem.quantity}, solicitado: ${amount}.`,
        );
      }

      // 2. Decrement source — delete if quantity reaches 0
      const newSourceQty = sourceItem.quantity - amount;

      if (newSourceQty === 0) {
        await tx.shelfItem.delete({
          where: { id: sourceItem.id },
        });
      } else {
        await tx.shelfItem.update({
          where: { id: sourceItem.id },
          data: { quantity: newSourceQty },
        });
      }

      // 3. Upsert target — create or increment
      await tx.shelfItem.upsert({
        where: {
          shelfId_productId: { shelfId: targetShelfId, productId },
        },
        update: {
          quantity: { increment: amount },
        },
        create: {
          shelfId: targetShelfId,
          productId,
          quantity: amount,
        },
      });

      return {
        message: `Se movieron ${amount} unidades del producto (ID: ${productId}) de estantería ${sourceShelfId} a estantería ${targetShelfId}.`,
        moved: amount,
        productId,
        sourceShelfId,
        targetShelfId,
      };
    });
  }

  /**
   * Moves stock of multiple products from one shelf to another inside a single transaction.
   */
  async moveStockBatch(dto: MoveStockBatchDto) {
    const { sourceShelfId, targetShelfId, items } = dto;

    if (sourceShelfId === targetShelfId) {
      throw new BadRequestException(
        'La estantería de origen y destino no pueden ser la misma.',
      );
    }

    if (!items || items.length === 0) {
      throw new BadRequestException(
        'No se han seleccionado productos para mover.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const results: { productId: number; amount: number }[] = [];

      for (const item of items) {
        const { productId, amount } = item;

        // 1. Verify source shelf item exists and has enough stock
        const sourceItem = await tx.shelfItem.findUnique({
          where: {
            shelfId_productId: { shelfId: sourceShelfId, productId },
          },
        });

        if (!sourceItem) {
          throw new NotFoundException(
            `El producto (ID: ${productId}) no se encuentra en la estantería origen (ID: ${sourceShelfId}).`,
          );
        }

        if (sourceItem.quantity < amount) {
          throw new BadRequestException(
            `Stock insuficiente para producto ID ${productId}. Disponible: ${sourceItem.quantity}, solicitado: ${amount}.`,
          );
        }

        // 2. Decrement source — delete if quantity reaches 0
        const newSourceQty = sourceItem.quantity - amount;

        if (newSourceQty === 0) {
          await tx.shelfItem.delete({
            where: { id: sourceItem.id },
          });
        } else {
          await tx.shelfItem.update({
            where: { id: sourceItem.id },
            data: { quantity: newSourceQty },
          });
        }

        // 3. Upsert target — create or increment
        await tx.shelfItem.upsert({
          where: {
            shelfId_productId: { shelfId: targetShelfId, productId },
          },
          update: {
            quantity: { increment: amount },
          },
          create: {
            shelfId: targetShelfId,
            productId,
            quantity: amount,
          },
        });

        results.push({ productId, amount });
      }

      return {
        message: `Se movieron ${results.length} productos de estantería ${sourceShelfId} a estantería ${targetShelfId}.`,
        movedCount: results.length,
        items: results,
        sourceShelfId,
        targetShelfId,
      };
    });
  }

  /**
   * Identifies products fragmented across more than one shelf
   * and returns consolidation suggestions.
   */
  async getConsolidationSuggestions(): Promise<ConsolidationSuggestion[]> {
    // Get all shelf items with product and shelf info
    const allItems = await this.prisma.shelfItem.findMany({
      include: {
        product: true,
        shelf: true,
      },
      orderBy: [{ productId: 'asc' }, { quantity: 'desc' }],
    });

    // Group by productId
    const grouped = new Map<
      number,
      {
        productName: string;
        sku: string | null;
        locations: {
          shelfId: number;
          locationCode: string;
          quantity: number;
        }[];
      }
    >();

    for (const item of allItems) {
      if (!grouped.has(item.productId)) {
        grouped.set(item.productId, {
          productName: item.product.name,
          sku: item.product.sku,
          locations: [],
        });
      }
      grouped.get(item.productId)!.locations.push({
        shelfId: item.shelf.id,
        locationCode: item.shelf.locationCode,
        quantity: item.quantity,
      });
    }

    // Filter only fragmented products (2+ shelves)
    const suggestions: ConsolidationSuggestion[] = [];

    for (const [productId, data] of grouped) {
      if (data.locations.length > 1) {
        const totalQuantity = data.locations.reduce(
          (sum, loc) => sum + loc.quantity,
          0,
        );
        const locationDescriptions = data.locations
          .map((loc) => `${loc.locationCode} (${loc.quantity} uds)`)
          .join(', ');

        suggestions.push({
          productId,
          productName: data.productName,
          sku: data.sku,
          totalQuantity,
          locations: data.locations,
          message: `El producto "${data.productName}" está fragmentado en ${data.locations.length} estanterías: ${locationDescriptions}. Total: ${totalQuantity} uds. ¿Desea consolidar el stock en una sola ubicación?`,
        });
      }
    }

    return suggestions;
  }

  /**
   * Adds stock of a product to a shelf.
   * If the product already exists on the shelf, increments the quantity.
   * Otherwise, creates a new shelf item.
   */
  async addStock(dto: AddStockDto) {
    const { shelfId, productId, quantity } = dto;

    // Validate shelf exists
    const shelf = await this.prisma.shelf.findUnique({
      where: { id: shelfId },
    });
    if (!shelf) {
      throw new NotFoundException(`Estantería (ID: ${shelfId}) no encontrada.`);
    }

    // Validate product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Producto (ID: ${productId}) no encontrado.`);
    }

    // Upsert shelf item
    const item = await this.prisma.shelfItem.upsert({
      where: {
        shelfId_productId: { shelfId, productId },
      },
      update: {
        quantity: { increment: quantity },
      },
      create: {
        shelfId,
        productId,
        quantity,
      },
      include: { product: true, shelf: true },
    });

    return {
      message: `Se agregaron ${quantity} unidades de "${product.name}" a ${shelf.locationCode}.`,
      item,
    };
  }

  /**
   * Directly sets the quantity of a ShelfItem (for physical count corrections).
   */
  async updateStock(dto: UpdateStockDto) {
    const item = await this.prisma.shelfItem.findUnique({
      where: { id: dto.shelfItemId },
      include: { product: true, shelf: true },
    });

    if (!item) {
      throw new NotFoundException(
        `Item de inventario (ID: ${dto.shelfItemId}) no encontrado.`,
      );
    }

    const updated = await this.prisma.shelfItem.update({
      where: { id: dto.shelfItemId },
      data: { quantity: dto.newQuantity },
      include: { product: true, shelf: true },
    });

    return {
      message: `Cantidad de "${item.product.name}" en ${item.shelf.locationCode} actualizada a ${dto.newQuantity}.`,
      item: updated,
    };
  }

  /**
   * Removes a ShelfItem entirely (product from shelf).
   */
  async removeStock(shelfItemId: number) {
    const item = await this.prisma.shelfItem.findUnique({
      where: { id: shelfItemId },
      include: { product: true, shelf: true },
    });

    if (!item) {
      throw new NotFoundException(
        `Item de inventario (ID: ${shelfItemId}) no encontrado.`,
      );
    }

    await this.prisma.shelfItem.delete({ where: { id: shelfItemId } });

    return {
      message: `"${item.product.name}" eliminado de ${item.shelf.locationCode}.`,
    };
  }
}
