import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ProductModule } from './product/product.module';
import { ShelfModule } from './shelf/shelf.module';
import { InventoryModule } from './inventory/inventory.module';
import { AuthModule } from './auth/auth.module';
import { CategoryModule } from './category/category.module';

@Module({
  imports: [
    PrismaModule,
    ProductModule,
    ShelfModule,
    InventoryModule,
    AuthModule,
    CategoryModule,
  ],
})
export class AppModule {}
