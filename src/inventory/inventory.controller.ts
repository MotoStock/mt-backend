import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { MoveStockDto } from './dto/move-stock.dto';
import { AddStockDto } from './dto/add-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { MoveStockBatchDto } from './dto/move-stock-batch.dto';
import { ConsolidateProductDto } from './dto/consolidate-product.dto';

@Controller('api/inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('move')
  moveStock(@Body() dto: MoveStockDto) {
    return this.inventoryService.moveStock(dto);
  }

  @Post('move-batch')
  moveStockBatch(@Body() dto: MoveStockBatchDto) {
    return this.inventoryService.moveStockBatch(dto);
  }

  @Post('add-stock')
  addStock(@Body() dto: AddStockDto) {
    return this.inventoryService.addStock(dto);
  }

  @Post('consolidate')
  consolidate(@Body() dto: ConsolidateProductDto) {
    return this.inventoryService.consolidateProduct(dto);
  }

  @Patch('update-stock')
  updateStock(@Body() dto: UpdateStockDto) {
    return this.inventoryService.updateStock(dto);
  }

  @Delete('remove-stock/:id')
  removeStock(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.removeStock(id);
  }

  @Get('consolidation-suggestions')
  getConsolidationSuggestions() {
    return this.inventoryService.getConsolidationSuggestions();
  }
}
