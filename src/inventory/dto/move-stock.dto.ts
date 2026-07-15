import { IsInt, IsPositive } from 'class-validator';

export class MoveStockDto {
  @IsInt()
  productId: number;

  @IsInt()
  sourceShelfId: number;

  @IsInt()
  targetShelfId: number;

  @IsInt()
  @IsPositive()
  amount: number;
}
