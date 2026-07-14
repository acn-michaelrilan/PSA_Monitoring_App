const { fetchSupabase } = require('../utils/supabase-client');
const {
  normalize,
  createMapBy,
  createSetMapBy,
  getUnionKeys,
  areSetsEqual,
  formatSet,
  groupBy
} = require('../utils/checkpoint-utils');

function handleError(req, context, error) {
  console.error(`${context} Error:`, error);

  return req.error(
    500,
    `${context} failed: ${error.message}`
  );
}

function createCheckpointLogic() {
  return {
    
    async readAvailableBoxCheck(req) {
      try {
        const [disData, psaData] = await Promise.all([
          fetchSupabase('DIS', 'DIS_CBR_TBLBOXED', {
            select: 'BoxNumber,Processed',
            Processed: 'eq.6',
            Verified: 'eq.true'
          }),
          fetchSupabase('PSA', 'ZT_BOX_FOR_BOL', {
            select: 'BoxNumber,Status',
            Status: 'eq.1'
          })
        ]);

        const disMap = createMapBy(disData, item => item.BoxNumber);
        const psaMap = createMapBy(psaData, item => item.BoxNumber);
        const allBoxNumbers = getUnionKeys(disMap, psaMap);

        let result = [...allBoxNumbers].map(boxNumber => {
          const disRecord = disMap.get(boxNumber);
          const psaRecord = psaMap.get(boxNumber);

          return {
            PSABoxNumber: psaRecord?.BoxNumber ?? null,
            PSAStatus: psaRecord?.Status ?? null,

            DISBoxNumber: disRecord?.BoxNumber ?? null,
            DISProcessed: disRecord?.Processed ?? null,

            Matched: Boolean(disRecord && psaRecord)
          };
        });
        
        // Generic OData Filter
        const matched = req.query?.SELECT?.where?.find(
          item => item?.val !== undefined
        )?.val;
        
        const count =
          req.req?.query?.count === 'true';

        
        if (matched !== undefined) {
          result = result.filter(item => item.Matched === matched);
        }

      // Count Mode
        if (count) {
          return [{
            Count: result.length
          }];
        }
        return result;

      } catch (error) {
        return handleError(req, 'AvailableBoxCheck', error);
      }
    },

    async readShippedBolCheck(req) {
      try {
        const [psaData, disData] = await Promise.all([
          fetchSupabase('PSA', 'ZT_SHIPMENT_REPORT', {
            select: 'BolNo,TotalUnits,TotalVolume,TotalBoxes'
          }),
          fetchSupabase('DIS', 'DIS_TBLSHIPPED', {
            select: 'Blading,TotalUnits,TotalVolume,TotalBoxes'
          })
        ]);

        const psaMap = createMapBy(psaData, (item) => item.BolNo);
        const disMap = createMapBy(disData, (item) => item.Blading);
        const allBolNumbers = getUnionKeys(psaMap, disMap);
      
        let result = [...allBolNumbers].map((bolNumber) => {
          const psaRecord = psaMap.get(bolNumber);
          const disRecord = disMap.get(bolNumber);

          const psaTotalUnits = psaRecord ? normalize(psaRecord.TotalUnits) : null;
          const psaTotalVolume = psaRecord ? normalize(psaRecord.TotalVolume) : null;
          const psaTotalBoxes = psaRecord ? normalize(psaRecord.TotalBoxes) : null;

          const disTotalUnits = disRecord ? normalize(disRecord.TotalUnits) : null;
          const disTotalVolume = disRecord ? normalize(disRecord.TotalVolume) : null;
          const disTotalBoxes = disRecord ? normalize(disRecord.TotalBoxes) : null;

          return {
            PSABolNo: psaRecord ? normalize(psaRecord.BolNo) : null,
            PSATotalUnits: psaTotalUnits,
            PSATotalVolume: psaTotalVolume,
            PSATotalBoxes: psaTotalBoxes,

            DISBlading: disRecord ? normalize(disRecord.Blading) : null,
            DISTotalUnits: disTotalUnits,
            DISTotalVolume: disTotalVolume,
            DISTotalBoxes: disTotalBoxes,

            MatchedUnits: Boolean(
              psaRecord &&
              disRecord &&
              psaTotalUnits === disTotalUnits
            ),

            MatchedVolume: Boolean(
              psaRecord &&
              disRecord &&
              psaTotalVolume === disTotalVolume
            ),

            MatchedBoxes: Boolean(
              psaRecord &&
              disRecord &&
              psaTotalBoxes === disTotalBoxes
            )
          };
        });


        // Generic OData Filter
        const where = req.query?.SELECT?.where || [];

        const filters = {};

        for (let i = 0; i < where.length; i++) {
          if (where[i]?.ref && where[i + 2]?.val !== undefined) {
            filters[where[i].ref[0]] = where[i + 2].val;
          }
        }

        // Filter fields
        const filterFields = [
          'MatchedUnits',
          'MatchedVolume',
          'MatchedBoxes'
        ];

        filterFields.forEach(field => {
          if (filters[field] !== undefined) {
            result = result.filter(
              row => row[field] === filters[field]
            );
          }
        });

        // Count
        // Example:
        // ?$filter=MatchedUnits eq false&count=true
        const count =
          req.req?.query?.count === 'true';

        if (count) {
          return {
            Count: result.length
          };
        }

        return result;

      } catch (error) {
        return handleError(req, 'ShippedBolCheck', error);
      }
    },

    async readShippedConsigneeBOLCheck(req) {
      try {
        const [psaData, disData] = await Promise.all([
          fetchSupabase('PSA', 'ZT_SHIPMENT_REPORT', {
            select: 'BolNo,ConsigneeNo'
          }),
          fetchSupabase('DIS', 'DIS_TBLSHIPPED', {
            select: 'Blading,Customer'
          })
        ]);

        const psaMap = createMapBy(psaData, (item) => item.BolNo);
        const disMap = createMapBy(disData, (item) => item.Blading);
        const allBolNumbers = getUnionKeys(psaMap, disMap);

        
        let result = [...allBolNumbers].map((bolNumber) => {
          const psaRecord = psaMap.get(bolNumber);
          const disRecord = disMap.get(bolNumber);

          const psaConsignee = psaRecord ? normalize(psaRecord.ConsigneeNo) : null;
          const disCustomer = disRecord ? normalize(disRecord.Customer) : null;

          return {
            PSABolNo: psaRecord ? normalize(psaRecord.BolNo) : null,
            PSAConsigneeNo: psaConsignee,

            DISBlading: disRecord ? normalize(disRecord.Blading) : null,
            DISCustomer: disCustomer,

            Matched: Boolean(
              psaRecord &&
              disRecord &&
              psaConsignee === disCustomer
            )
          };
        });

        // Generic OData Filter
        const where = req.query?.SELECT?.where || [];

        const filters = {};

        for (let i = 0; i < where.length; i++) {
          if (where[i]?.ref && where[i + 2]?.val !== undefined) {
            filters[where[i].ref[0]] = where[i + 2].val;
          }
        }

        // Filter fields
        const filterFields = [
          'Matched'
        ];

        filterFields.forEach(field => {
          if (filters[field] !== undefined) {
            result = result.filter(
              row => row[field] === filters[field]
            );
          }
        });

        // Count Mode
        // Example:
        // ?$filter=Matched eq false&count=true
        const count =
          req.req?.query?.count === 'true';

        if (count) {
          return {
            Count: result.length
          };
        }

        return result;

      } catch (error) {
        return handleError(req, 'ShippedConsigneeBOLCheck', error);
      }
    },

    async readPartNumberBOLCheck(req) {
      try {
        const [psaData, disData] = await Promise.all([
          fetchSupabase('PSA', 'ZT_SHIPMENT_REPORT', {
            select: 'BolNo,PartNumber'
          }),
          fetchSupabase('DIS', 'CCC_SHIPPEDTBLBOLPARTNUMBER', {
            select: 'Blading,PartNumber'
          })
        ]);

        const psaMap = createSetMapBy(
          psaData,
          (item) => item.BolNo,
          (item) => item.PartNumber
        );

        const disMap = createSetMapBy(
          disData,
          (item) => item.Blading,
          (item) => item.PartNumber
        );

        const allBolNumbers = getUnionKeys(psaMap, disMap);
        
        let result = [...allBolNumbers].map((bolNumber) => {
          const psaParts = psaMap.get(bolNumber) || new Set();
          const disParts = disMap.get(bolNumber) || new Set();

          return {
            PSABolNo: psaMap.has(bolNumber) ? bolNumber : null,

            PSAPartNumber: formatSet(psaParts),

            DISBlading: disMap.has(bolNumber) ? bolNumber : null,
            DISPartNumber: formatSet(disParts),

            Matched: areSetsEqual(psaParts, disParts)
          };
        });

        // Generic OData Filter
        const where = req.query?.SELECT?.where || [];

        const filters = {};

        for (let i = 0; i < where.length; i++) {
          if (where[i]?.ref && where[i + 2]?.val !== undefined) {
            filters[where[i].ref[0]] = where[i + 2].val;
          }
        }

        // Future-proof filter fields
        const filterFields = [
          'Matched'
        ];

        filterFields.forEach(field => {
          if (filters[field] !== undefined) {
            result = result.filter(
              row => row[field] === filters[field]
            );
          }
        });

        // Count Mode
        // Example:
        // ?$filter=Matched eq false&count=true
        const count =
          req.req?.query?.count === 'true';

        if (count) {
          return {
            Count: result.length
          };
        }

        return result;

      } catch (error) {
        return handleError(req, 'PartNumberBOLCheck', error);
      }
    },

    async readMaterialInformationCheck(req) {
      try {
        const [psaData, disData] = await Promise.all([
          fetchSupabase('PSA', 'ZT_BOX_FOR_BOL', {
            select: 'BoxNumber,MaterialDescription'
          }),
          fetchSupabase('PSA', 'ODS_VW_BOXED', {
            select: 'BoxNumber,MaterialDesc'
          })
        ]);

        const psaMap = createMapBy(psaData, (item) => item.BoxNumber);

        const disGroupedMap = groupBy(
          disData,
          (item) => item.BoxNumber,
          (item) => item.MaterialDesc
        );

        const disFinalMap = new Map();

        disGroupedMap.forEach((descriptionList, boxNumber) => {
          const hasNull = descriptionList.some((description) => description === null);

          if (hasNull) {
            disFinalMap.set(boxNumber, null);
            return;
          }

          const uniqueDescriptions = [...new Set(descriptionList)];

          disFinalMap.set(
            boxNumber,
            uniqueDescriptions.length === 1
              ? uniqueDescriptions[0]
              : uniqueDescriptions.join(', ')
          );
        });

        const allBoxNumbers = getUnionKeys(psaMap, disFinalMap);
        
        let result = [...allBoxNumbers].map((boxNumber) => {
          const psaRecord = psaMap.get(boxNumber);
          const disMaterialDescription = disFinalMap.get(boxNumber);

          const psaMaterialDescription = psaRecord
            ? normalize(psaRecord.MaterialDescription)
            : null;

          return {
            PSABoxNumber: psaRecord
              ? normalize(psaRecord.BoxNumber)
              : null,

            PSAMaterialDescription: psaMaterialDescription,

            DISBoxNumber: disFinalMap.has(boxNumber)
              ? boxNumber
              : null,

            DISMaterialDesc: disMaterialDescription,

            Matched: Boolean(
              psaMaterialDescription &&
              disMaterialDescription &&
              psaMaterialDescription === disMaterialDescription
            )
          };
        });


        // =========================================
        // Generic OData Filter Support
        // =========================================
        const where = req.query?.SELECT?.where || [];

        const filters = {};

        for (let i = 0; i < where.length; i++) {
          if (where[i]?.ref && where[i + 2]?.val !== undefined) {
            filters[where[i].ref[0]] = where[i + 2].val;
          }
        }


        // =========================================
        // Future-proof filter fields
        // =========================================
        const filterFields = [
          'Matched'
        ];

        filterFields.forEach(field => {
          if (filters[field] !== undefined) {
            result = result.filter(
              row => row[field] === filters[field]
            );
          }
        });


        // =========================================
        // Count Mode
        // Example:
        // ?$filter=Matched eq false&count=true
        // =========================================
        const count =
          req.req?.query?.count === 'true';

        if (count) {
          return {
            Count: result.length
          };
        }

        return result;

      } catch (error) {
        return handleError(req, 'MaterialInformationCheck', error);
      }
    }
  };
}

module.exports = {
  createCheckpointLogic
};