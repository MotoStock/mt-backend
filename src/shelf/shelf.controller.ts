import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ShelfService } from './shelf.service';
import { CreateShelfDto } from './dto/create-shelf.dto';
import { UpdateShelfDto } from './dto/update-shelf.dto';

@Controller('api/shelves')
export class ShelfController {
  constructor(private readonly shelfService: ShelfService) {}

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.shelfService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
    });
  }

  /** All shelves as a flat list (for move-stock target selection) */
  @Get('flat')
  findAllFlat(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.shelfService.findAllFlat({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.shelfService.findOne(id);
  }

  @Get(':id/children')
  findChildren(@Param('id', ParseIntPipe) id: number) {
    return this.shelfService.findChildren(id);
  }

  @Get(':id/totals')
  getTotals(@Param('id', ParseIntPipe) id: number) {
    return this.shelfService.getRecursiveTotals(id);
  }

  @Get(':id/breadcrumbs')
  getBreadcrumbs(@Param('id', ParseIntPipe) id: number) {
    return this.shelfService.getBreadcrumbs(id);
  }

  @Post()
  create(@Body() dto: CreateShelfDto) {
    return this.shelfService.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateShelfDto) {
    return this.shelfService.update(id, dto);
  }

  @Delete(':id/reassign')
  removeAndReassign(@Param('id', ParseIntPipe) id: number) {
    return this.shelfService.removeAndReassign(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.shelfService.remove(id);
  }
}
