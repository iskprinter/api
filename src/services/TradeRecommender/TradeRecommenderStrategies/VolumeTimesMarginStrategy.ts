
// import { Character } from 'src/app/entities/Character';
// import { Deal } from 'src/app/entities/DealFinder/Deal';
// import { FakeLocalStorageService } from './FakeLocalStorage';
// import { LocalStorageInterface } from './LocalStorageInterface';
// import { Type } from 'src/app/entities/Type';
// import { WorkerPool } from 'src/app/entities/WorkerPool';
// import { CharacterService } from 'src/app/services/character/character.service';
// import { AuthenticatorService } from 'src/app/services/authenticator/authenticator.service';

// // Establish a global state.
// const ip: any = { charData: {} };

// let itemData = {};
// let verbose;

// interface EveOrder {
//   type_id: number;
//   is_buy_order: boolean;
//   price: number;
//   issued: Date;
// }

// export class DealFinder {

//   static readonly BASE_SALES_TAX = 0.05;
//   // If there are no sell orders present on the market,
//   // is multiplied by the following factor to compute a sell price.
//   // The maximum transaction price in the historical data
//   static readonly HISTORICAL_SELL_FACTOR = 1.05;
//   static readonly MAX_ORDER_DAYS = 1;
//   static readonly MIN_BUY_PRICE = 0.01;

//   static readonly HISTORICAL_DATA_CACHE_DURATION = 5; // days

//   types: Type[];
//   historicalData: { [key: number]: any } = {};

//   constructor(
//     private authenticatorService: AuthenticatorService,
//     private localStorage: LocalStorageInterface,
//     private characterService: CharacterService
//   ) {
//     this.localStorage = localStorage || new FakeLocalStorageService();
//   }

//   async findDealsForCharacter(character: Character): Promise<Deal[]> {

//     const [
//       types,
//       characterLocation,
//     ] = await Promise.all([
//       this._getMarketableTypes(),
//       this.characterService.getLocationOfCharacter(character),
//     ]);
//     this.types = types;

//     if (!characterLocation.structureId) {
//       throw new Error('The character is not docked at a structure. Please dock at the structure (not a station) where you would like to trade.');
//     }

//     const [
//       currentPrices,
//       _1,
//       walletBalance,
//       orders,
//     ] = await Promise.all<any>([
//       this._getCurrentPrices(characterLocation.structureId),
//       this._getHistoricalData(characterLocation.regionId, this.types.map((type) => type.typeId)),
//       this.characterService.getWalletBalanceOfCharacter(character),
//       this.characterService.getOrdersOfCharacter(character)
//     ]);
//     let deals: Deal[] = await this._computeDeals(currentPrices, this.historicalData, character);
//     deals = this._scaleOrFilterByAffordability(deals, walletBalance);
//     return deals
//       .filter((deal) => deal.profit > 0)
//       // Only include deals for which there is NOT an existing order for the same typeId and location.
//       .filter((deal) => !orders.some((order) =>
//         order.typeId === deal.type.typeId
//         && order.locationId === characterLocation.structureId
//       ))
//       .sort((deal1, deal2) => deal2.profit - deal1.profit);

//   }

//   async _getMarketableTypes(): Promise<Type[]> {
//     const typeResponse = await this.authenticatorService.backendRequest('get', '/types');
//     const types = typeResponse.body as Type[];
//     console.log(`Found ${types.length} marketable types.`);
//     return types;
//   }

//   async _getHistoricalData(regionId: number, typeIds: number[]): Promise<PromiseSettledResult<any>[]> {
//     const storedHistoricalDataString = this.localStorage.getItem('historicalData');
//     const storedHistoricalData = storedHistoricalDataString ? JSON.parse(storedHistoricalDataString) : {};

//     const workerPool = new WorkerPool();
//     return Promise.allSettled(typeIds.map((typeId) => workerPool.runTask(async () => {

//       // Check the in-memory data
//       if (this.historicalData?.[typeId]) {
//         return;
//       }

//       // Check the localStorage data
//       if (storedHistoricalData[typeId]?.timestamp > (Date.now() - 1000 * 60 * 60 * 24 * DealFinder.HISTORICAL_DATA_CACHE_DURATION)) {
//         this.historicalData[typeId] = storedHistoricalData[typeId].data;
//         return;
//       }

//       // Fetch fresh data
//       let analyzedHistory;
//       try {
//         const response = await this.authenticatorService.eveRequest<any>(
//           'get',
//           `https://esi.evetech.net/latest/markets/${regionId}/history`,
//           { params: { type_id: typeId } }
//         );
//         const history: any = response.body;
//         analyzedHistory = this._analyzeHistory(history);
//       } catch (err) {
//         if (err.status === 404) {
//           analyzedHistory = {
//             maxPrice: 0,
//             avgDailyBuyVol: 0,
//             avgDailySellVol: 0,
//           };
//         } else {
//           console.log('Unhandled error in DealFinder.getHistoricalData:');
//           console.error(err);
//           throw err;
//         }
//       }

//       this.historicalData[typeId] = analyzedHistory;

//       // Save to localStorage
//       const storedHistoryString = this.localStorage.getItem('historicalData');
//       const storedHistory = storedHistoryString ? JSON.parse(storedHistoryString) : {};
//       storedHistory[typeId] = {
//         timestamp: Date.now(),
//         data: analyzedHistory
//       };
//       this.localStorage.setItem('historicalData', JSON.stringify(storedHistory));

//     })));

//   }

//   _analyzeHistory(data) {

//     let maxPrice = 0;

//     const workingData = {
//       totalVolumeOfBuys: 0,
//       totalVolumeOfSells: 0,
//       movingMaxBuyTotal: 0,
//       movingMinSellTotal: 0,
//       maxBuyMovingAvg: 0, // = itemData[typeId].maxBuy;
//       minSellMovingAvg: 0, // = itemData[typeId].minSell;
//     };

//     if (data.length === 0) {
//       return {
//         maxPrice: 0,
//         avgDailyBuyVol: 0,
//         avgDailySellVol: 0,
//       };
//     }

//     let buyFraction;
//     const firstDate = Number(new Date(data[0].date));
//     let dateSpan;

//     for (let i = 0; i < data.length; i += 1) {

//       maxPrice = Math.max(maxPrice, data[i].highest);

//       let a = [
//         [
//           data[i].highest,              // [0][0]
//           data[i].lowest                // [0][1]
//         ],
//         [
//           workingData.minSellMovingAvg, // [1][0]
//           workingData.maxBuyMovingAvg   // [1][1]
//         ]
//       ];

//       //TODO Use linear algebra to identify the option with minimum error.
//       let x = [
//         data[i].highest,
//         data[i].lowest
//       ];
//       let y = [
//         workingData.minSellMovingAvg,
//         workingData.maxBuyMovingAvg
//       ];
//       //let beta = Math.transpose(x);

//       // Calculate the simple error for each option.
//       let b = [
//         [a[0][0] - a[1][0],    // [0][0] = highest - minSell
//           a[0][0] - a[1][1]],  // [0][1] = highest - maxBuy
//         [a[0][1] - a[1][0],    // [1][0] = lowest - minSell
//           a[0][1] - a[1][1]]   // [1][1] = lowest - maxBuy
//       ];

//       // Square the errors.
//       for (let j = 0; j < b.length; j += 1) {
//         for (let k = 0; k < b[j].length; k += 1) {
//           b[j][k] *= b[j][k];
//         }
//       }

//       // Calculate the total error for each possibility.
//       let error = [
//         [b[0][0] + b[1][0],  // [0][0] = highestIsSell and LowestIsSell
//           b[0][0] + b[1][1]], // [0][1] = highestIsSell and LowestIsBuy
//         [b[0][1] + b[1][0],  // [1][0] = highestIsBuy and LowestIsSell
//           b[0][1] + b[1][1]]  // [1][1] = highestIsBuy and LowestIsBuy
//       ];

//       // Initialize a pair of indices that will correspond to the min error.
//       let minIndex = {
//         j: 0,
//         k: 0
//       };

//       // Find the option with the minimum error.
//       for (let j = 0; j < error.length; j += 1) {
//         for (let k = 0; k < error[j].length; k += 1) {
//           if (error[j][k] < error[minIndex.j][minIndex.k]) {
//             minIndex.j = j;
//             minIndex.k = k;
//           }
//         }
//       }

//       buyFraction = this._getBuyFraction(workingData, data, i, minIndex);
//       this._updateCumulativeTotals(workingData, data, i, buyFraction);

//       let finalDate = Number(new Date(data[i].date));
//       dateSpan = 1 + (finalDate - firstDate) / 1000 / 60 / 60 / 24;

//     }
//     let avgBuyVolumePerDay = workingData.totalVolumeOfBuys / dateSpan;
//     let avgSellVolumePerDay = workingData.totalVolumeOfSells / dateSpan;
//     return {
//       maxPrice,
//       avgDailyBuyVol: avgBuyVolumePerDay,
//       avgDailySellVol: avgSellVolumePerDay,
//     };

//   }

//   // WARNING: This is a temporary refactor.
//   // This function will MUTATE the workingData parameter.
//   _getBuyFraction(workingData, data, i, minIndex) {
//     switch (10 * minIndex.j + minIndex.k) {
//     case 0:
//       // Highest and lowest are both sell.
//       return 0;
//     case 1:
//       // Highest price is sell and lowest price is buy.
//       return (data[i].highest - data[i].average)
//           / (data[i].highest - data[i].lowest);
//     case 10:
//       // Highest is buy and lowest is sell.
//       // This is not possible. Make an assumption.
//       let totalCumulativeVolume = workingData.totalVolumeOfBuys + workingData.totalVolumeOfSells;
//       if (totalCumulativeVolume == 0) {
//         // If there's nothing to go on, assume they're 50-50 split.
//         return 0.5;
//       } else {
//         // If we do have prior volume data, then assume it has the same
//         // distribution as what has already been seen.
//         return workingData.totalVolumeOfBuys / totalCumulativeVolume;
//       }
//     case 11:
//       // Highest and lowest are both buy.
//       return 1;
//     default:
//       throw new Error('Impossible combination if j and k. Please debug me.');
//     }

//   }

//   // WARNING: This is a temporary refactor.
//   // This function will MUTATE the workingData parameter.
//   _updateCumulativeTotals(workingData, data, i, buyFraction) {

//     let buyVolume = data[i].volume * buyFraction;
//     let sellVolume = data[i].volume - buyVolume;

//     workingData.totalVolumeOfBuys += buyVolume;
//     workingData.totalVolumeOfSells += sellVolume;

//     workingData.movingMaxBuyTotal += buyVolume * data[i].lowest;
//     workingData.movingMinSellTotal += sellVolume * data[i].highest;
//     if (workingData.totalVolumeOfBuys > 0) {
//       workingData.maxBuyMovingAvg = workingData.movingMaxBuyTotal / workingData.totalVolumeOfBuys;
//     }
//     if (workingData.totalVolumeOfSells > 0) {
//       workingData.minSellMovingAvg = workingData.movingMinSellTotal / workingData.totalVolumeOfSells;
//     }
//   }

//   // Use structure id to get structure orders.
//   async _getCurrentPrices(structureId: number): Promise<{ [key: number]: any }> {
//     console.log('Getting current prices...');

//     const response = await this.authenticatorService.eveRequest<any>(
//       'get',
//       `https://esi.evetech.net/latest/markets/structures/${structureId}`,
//     );
//     const totalPages = Number(response.headers.get('x-pages'));

//     const pages = [];
//     for (let i = 1; i <= totalPages; i += 1) {
//       pages.push(i);
//     }
//     const currentPrices = await pages
//       .map(async (pageNumber: number) => {
//         let response;
//         response = await this.authenticatorService.eveRequest<EveOrder[]>(
//           'get',
//           `https://esi.evetech.net/latest/markets/structures/${structureId}`,
//           { params: { page: pageNumber } }
//         );
//         const orders = response.body;
//         return orders;
//       })
//       .map(async (page: Promise<EveOrder[]>) => {

//         const pageSummary: { [key: number]: any } = {};

//         (await page).forEach((order) => {
//           if (pageSummary[order.type_id] === undefined) {
//             pageSummary[order.type_id] = {}
//           }
//           if (order.is_buy_order) {
//             if (
//               pageSummary[order.type_id].maxBuy === undefined
//               || order.price > pageSummary[order.type_id].maxBuy
//             ) { pageSummary[order.type_id].maxBuy = order.price; }
//           } else {
//             if (
//               pageSummary[order.type_id].minSell === undefined
//               || order.price < pageSummary[order.type_id].minSell
//             ) { pageSummary[order.type_id].minSell = order.price; }
//           }

//         });

//         return pageSummary;

//       })
//       .reduce(async (completeSummary, pageSummary) => {

//         const completeSummaryClone = { ...(await completeSummary) };

//         Object.entries(await pageSummary).forEach(([typeId, typeSummary]) => {

//           if (completeSummaryClone[typeId] === undefined) {
//             completeSummaryClone[typeId] = typeSummary;
//             return;
//           }
//           if (
//             completeSummaryClone[typeId].maxBuy === undefined
//             || typeSummary.maxBuy > completeSummaryClone[typeId].maxBuy
//           ) { completeSummaryClone[typeId].maxBuy = typeSummary.maxBuy; }
//           if (
//             completeSummaryClone[typeId].minSell === undefined
//             || typeSummary.minSell < completeSummaryClone[typeId].minSell
//           ) { completeSummaryClone[typeId].minSell = typeSummary.minSell; }

//         });

//         return completeSummaryClone;
//       });
//     return currentPrices;
//   }

//   async _computeDeals(
//     currentPrices: { [key: number]: any },
//     historicalData: { [key: number]: any },
//     character: Character,
//   ): Promise<Deal[]> {

//     const skills = await this.characterService.getSkillsOfCharacter(character);

//     const brokerRelationsSkillLevel = skills
//       .filter((skill) => skill.skillId === 3446)[0]
//       .activeSkillLevel;
//     const accountingSkillLevel = skills
//       .filter((skill) => skill.skillId === 16622)[0]
//       .activeSkillLevel;

//     const stationIsNpc = false; // TODO: retrieve this from the current structure info
//     let brokerFee;
//     if (stationIsNpc) {
//       const npcStructureBrokerFee = 0.05; // TODO: retrieve this from the current structure info
//       brokerFee = npcStructureBrokerFee - 0.003 * brokerRelationsSkillLevel;
//     } else {
//       const firstImperialPalaceBrokerFee = 0.02;  // TODO: retrieve from current structure
//       brokerFee = firstImperialPalaceBrokerFee;
//     }

//     const salesTax = DealFinder.BASE_SALES_TAX * (1 - 0.011 * accountingSkillLevel);

//     const buyFeeAndTaxRate = brokerFee;
//     const sellFeeAndTaxRate = brokerFee + salesTax;

//     let deals: Deal[] = [];

//     for (const [typeId, historicalDatum] of Object.entries(historicalData)) {

//       const volume = DealFinder.MAX_ORDER_DAYS * Math.min(historicalDatum.avgDailyBuyVol, historicalDatum.avgDailySellVol);
//       let buyPrice = DealFinder.MIN_BUY_PRICE;
//       if (currentPrices[typeId]?.maxBuy) {
//         buyPrice = Math.max(buyPrice, 1.001 * currentPrices[typeId].maxBuy);
//       }
//       let sellPrice = DealFinder.HISTORICAL_SELL_FACTOR * historicalDatum.maxPrice;
//       if (currentPrices[typeId]?.minSell) {
//         sellPrice = Math.min(sellPrice, 0.999 * currentPrices[typeId].minSell);
//       }
//       const buyFeeAndTax = Math.max(100, volume * buyPrice * buyFeeAndTaxRate);
//       const sellFeeAndTax = Math.max(100, volume * sellPrice * sellFeeAndTaxRate);
//       const fees = buyFeeAndTax + sellFeeAndTax;
//       const type = this.types.find((type) => type.typeId === Number(typeId));
//       deals.push(new Deal(type, volume, buyPrice, sellPrice, fees));
//     }
//     return deals;
//   }

//   _scaleOrFilterByAffordability(deals: Deal[], walletBalance: number) {
//     const affordableDeals: Deal[] = [];
//     for (const deal of deals) {
//       if (deal.volume * deal.buyPrice + deal.fees > walletBalance) {
//         const feePerUnit = deal.fees / deal.volume;
//         const maxVolume = Math.floor(walletBalance / (deal.buyPrice + feePerUnit));
//         if (maxVolume > 0) {
//           affordableDeals.push(new Deal(
//             deal.type,
//             maxVolume,
//             deal.buyPrice,
//             deal.sellPrice,
//             deal.fees * maxVolume / deal.volume
//           ));
//         }
//       } else {
//         affordableDeals.push(new Deal(
//           deal.type,
//           deal.volume,
//           deal.buyPrice,
//           deal.sellPrice,
//           deal.fees
//         ));
//       }
//     }
//     return affordableDeals;
//   }

//   // Send to the console and also update the status shown on the page.
//   _consoleAndStatus(content) {
//     if (verbose) {
//       this._status(content);
//     }
//     console.log(content);
//   }

//   // Update the status shown on the page.
//   _status(content) {
//     // no op
//   }

//   // Used to call functions that could return an error due to bad server response.
//   _wrapperForFetch(api, fetchFunctionName, ...fetchArgs) {
//     return new Promise((resolve, reject) => {
//       let result;
//       api[fetchFunctionName](...fetchArgs, (error, data, response) => {
//         result = { error: error, data: data, response: response };
//         resolve(result);
//       });
//     }).then((result: any) => {
//       return new Promise((resolve, reject) => {
//         if (!result.response || Math.floor(result.response.status / 100) == 5) {
//           this._consoleAndStatus('Encountered server-side 5xx error.\nRetrying in ' + ip.WAITDELAY + ' seconds...');
//           window.setTimeout(() => {
//             resolve(this._wrapperForFetch(api, fetchFunctionName, ...fetchArgs));
//           }, ip.WAITDELAY * 1000);
//         } else if (result.response.status == 404) {
//           // Remove this item from the data.
//           reject(404);
//         } else {
//           resolve(result);
//         }
//       });
//     });
//   }

//   _reprocessedValue(feedTypeId) {
//     return new Promise((resolve, reject) => {
//       let reprocessedValue = 0;
//       let productPrice;
//       for (let productTypeId in ip.reprocessingData[feedTypeId]) {
//         if (itemData[productTypeId]) {
//           if (itemData[productTypeId].minSell) {
//             productPrice = itemData[productTypeId].minSell;
//           } else if (itemData[productTypeId].maxBuy) {
//             productPrice = itemData[productTypeId].maxBuy;
//           } else {
//             productPrice = 0;
//           }
//           const productQuantity = ip.reprocessingData[feedTypeId][productTypeId];

//           reprocessedValue += productQuantity * productPrice;
//         }
//       }
//       if (ip.reprocessingData[feedTypeId]) {
//         reprocessedValue /= ip.reprocessingData[feedTypeId].feedQuantity;
//       }
//       return resolve(this._reprocessedValue);
//     });
//   }

// }
