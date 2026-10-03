import { IsInt, IsPositive } from 'class-validator';

export class UpdateStockDto {
  @IsInt()
  shelfItemId: number;

  @IsInt()
  @IsPositive()
  newQuantity: number;
}
