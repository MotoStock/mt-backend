import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  Min,
  ValidateNested,
} from 'class-validator';

export class MoveStockBatchItemDto {
  @IsInt()
  @Min(1)
  productId: number;

  @IsInt()
  @Min(1)
  amount: number;
}

export class MoveStockBatchDto {
  @IsInt()
  sourceShelfId: number;

  @IsInt()
  targetShelfId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MoveStockBatchItemDto)
  items: MoveStockBatchItemDto[];
}
