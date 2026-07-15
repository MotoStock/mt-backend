import { IsInt, IsPositive } from 'class-validator';

export class AddStockDto {
  @IsInt()
  shelfId: number;

  @IsInt()
  productId: number;

  @IsInt()
  @IsPositive()
  quantity: number;
}
