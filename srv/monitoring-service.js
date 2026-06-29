const cds = require('@sap/cds');
const fetch = require('node-fetch');

const supabaseBaseUrlPSA = process.env.PSA_ODS_PUBLIC_SUPABASE_URL;
const supabaseKeyPSA = process.env.PSA_ODS_PUBLIC_SUPABASE_ANON_KEY;

const  supabaseBaseUrlDIS = process.env.DIS_CCC_PUBLIC_SUPABASE_URL;
const supabaseKeyDIS = process.env.DIS_CCC_PUBLIC_SUPABASE_ANON_KEY;

module.exports = cds.service.impl(function () {

  const { AvailableBoxCheck, ShippedBolCheck, ShippedConsigneeBOLCheck, PartNumberBOLCheck, MaterialInformationCheck   } = this.entities;
  
  this.on('READ', AvailableBoxCheck, async (req) => {
      try {

        // Validate both environments
        if (!supabaseBaseUrlPSA || !supabaseKeyPSA) {
          return req.error(500, 'Missing PSA Supabase env variables.');
        }

        if (!supabaseBaseUrlDIS || !supabaseKeyDIS) {
          return req.error(500, 'Missing DIS Supabase env variables.');
        }

        // Normalize base URLs
        const psaBase = supabaseBaseUrlPSA.endsWith('/')
          ? supabaseBaseUrlPSA
          : `${supabaseBaseUrlPSA}/`;

        const disBase = supabaseBaseUrlDIS.endsWith('/')
          ? supabaseBaseUrlDIS
          : `${supabaseBaseUrlDIS}/`;

        // Separate header
        const psaHeaders = {
          apikey: supabaseKeyPSA,
          Authorization: `Bearer ${supabaseKeyPSA}`,
          'Content-Type': 'application/json'
        };

        const disHeaders = {
          apikey: supabaseKeyDIS,
          Authorization: `Bearer ${supabaseKeyDIS}`,
          'Content-Type': 'application/json'
        };

        // DIS fetch
        const disUrl =
          `${disBase}DIS_CBR_TBLBOXED` +
          `?select=BoxNumber,Processed` +
          `&Processed=eq.6` +
          `&Verified=eq.true`;

        //  PSA fetch
        const psaUrl =
          `${psaBase}ZT_BOX_FOR_BOL` +
          `?select=BoxNumber,Status` +
          `&Status=eq.1`;

        //  Parallel fetch
        const [disResponse, psaResponse] = await Promise.all([
          fetch(disUrl, { method: 'GET', headers: disHeaders }),
          fetch(psaUrl, { method: 'GET', headers: psaHeaders })
        ]);

        if (!disResponse.ok) {
          throw new Error(`DIS_CBR_TBLBOXED HTTP Error: ${disResponse.status}`);
        }

        if (!psaResponse.ok) {
          throw new Error(`ZT_BOX_FOR_BOL HTTP Error: ${psaResponse.status}`);
        }

        const disData = await disResponse.json();
        const psaData = await psaResponse.json();

        //  Maps for fast lookup
        const disMap = new Map();
        const psaMap = new Map();

        disData.forEach((item) => {
          if (item.BoxNumber) {
            disMap.set(String(item.BoxNumber).trim(), item);
          }
        });

        psaData.forEach((item) => {
          if (item.BoxNumber) {
            psaMap.set(String(item.BoxNumber).trim(), item);
          }
        });

        // Union of all box numbers
        const allBoxNumbers = new Set([
          ...disMap.keys(),
          ...psaMap.keys()
        ]);

        const result = [];

        allBoxNumbers.forEach((boxNumber) => {
          const disRecord = disMap.get(boxNumber);
          const psaRecord = psaMap.get(boxNumber);

          result.push({
            PSABoxNumber: psaRecord ? String(psaRecord.BoxNumber) : null,
            PSAStatus: psaRecord ? String(psaRecord.Status) : null,

            DISBoxNumber: disRecord ? String(disRecord.BoxNumber) : null,
            DISProcessed: disRecord ? String(disRecord.Processed) : null,

            Matched: Boolean(disRecord && psaRecord)
          });
        });

        return result;

      } catch (error) {
        console.error('AvailableBoxCheck Supabase Fetch Error:', error);

        return req.error(
          500,
          `Failed to fetch and compare Supabase data: ${error.message}`
        );
      }
    });

    
  this.on('READ', ShippedBolCheck, async (req) => {
      try {

        // Validate PSA environment variables
        if (!supabaseBaseUrlPSA || !supabaseKeyPSA) {
          return req.error(500, 'Missing PSA Supabase env variables.');
        }

        // Validate DIS environment variables
        if (!supabaseBaseUrlDIS || !supabaseKeyDIS) {
          return req.error(500, 'Missing DIS Supabase env variables.');
        }

        // Normalize base URLs
        const psaBase = supabaseBaseUrlPSA.endsWith('/')
          ? supabaseBaseUrlPSA
          : `${supabaseBaseUrlPSA}/`;

        const disBase = supabaseBaseUrlDIS.endsWith('/')
          ? supabaseBaseUrlDIS
          : `${supabaseBaseUrlDIS}/`;

        // PSA headers
        const psaHeaders = {
          apikey: supabaseKeyPSA,
          Authorization: `Bearer ${supabaseKeyPSA}`,
          'Content-Type': 'application/json'
        };

        // DIS headers
        const disHeaders = {
          apikey: supabaseKeyDIS,
          Authorization: `Bearer ${supabaseKeyDIS}`,
          'Content-Type': 'application/json'
        };

        // PSA fetch: ZT_SHIPMENT_REPORT
        const psaUrl =
          `${psaBase}ZT_SHIPMENT_REPORT` +
          `?select=BolNo,TotalUnits,TotalVolume,TotalBoxes`;

        // DIS fetch: DIS_TBLSHIPPED
        const disUrl =
          `${disBase}DIS_TBLSHIPPED` +
          `?select=Blading,TotalUnits,TotalVolume,TotalBoxes`;

        // Parallel fetch
        const [psaResponse, disResponse] = await Promise.all([
          fetch(psaUrl, { method: 'GET', headers: psaHeaders }),
          fetch(disUrl, { method: 'GET', headers: disHeaders })
        ]);

        if (!psaResponse.ok) {
          throw new Error(`ZT_SHIPMENT_REPORT HTTP Error: ${psaResponse.status}`);
        }

        if (!disResponse.ok) {
          throw new Error(`DIS_TBLSHIPPED HTTP Error: ${disResponse.status}`);
        }

        const psaData = await psaResponse.json();
        const disData = await disResponse.json();

        // Helper function to normalize values for comparison
        const normalizeValue = (value) => {
          if (value === null || value === undefined) return null;
          return String(value).trim();
        };

        // Maps for fast BOL lookup
        const psaMap = new Map();
        const disMap = new Map();

        psaData.forEach((item) => {
          if (item.BolNo) {
            psaMap.set(String(item.BolNo).trim(), item);
          }
        });

        disData.forEach((item) => {
          if (item.Blading) {
            disMap.set(String(item.Blading).trim(), item);
          }
        });

        // Union of all BOL numbers from PSA and DIS
        const allBolNumbers = new Set([
          ...psaMap.keys(),
          ...disMap.keys()
        ]);

        const result = [];

        allBolNumbers.forEach((bolNumber) => {
          const psaRecord = psaMap.get(bolNumber);
          const disRecord = disMap.get(bolNumber);

          const psaTotalUnits = psaRecord ? normalizeValue(psaRecord.TotalUnits) : null;
          const psaTotalVolume = psaRecord ? normalizeValue(psaRecord.TotalVolume) : null;
          const psaTotalBoxes = psaRecord ? normalizeValue(psaRecord.TotalBoxes) : null;

          const disTotalUnits = disRecord ? normalizeValue(disRecord.TotalUnits) : null;
          const disTotalVolume = disRecord ? normalizeValue(disRecord.TotalVolume) : null;
          const disTotalBoxes = disRecord ? normalizeValue(disRecord.TotalBoxes) : null;

          result.push({
            PSABolNo: psaRecord ? normalizeValue(psaRecord.BolNo) : null,
            PSATotalUnits: psaTotalUnits,
            PSATotalVolume: psaTotalVolume,
            PSATotalBoxes: psaTotalBoxes,

            DISBlading: disRecord ? normalizeValue(disRecord.Blading) : null,
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
          });
        });

        return result;

      } catch (error) {
        console.error('ShippedBolCheck Supabase Fetch Error:', error);

        return req.error(
          500,
          `Failed to fetch and compare shipped BOL Supabase data: ${error.message}`
        );
      }
    });

    
  this.on('READ', ShippedConsigneeBOLCheck, async (req) => {
      try {

        // Validate environments
        if (!supabaseBaseUrlPSA || !supabaseKeyPSA) {
          return req.error(500, 'Missing PSA Supabase env variables.');
        }

        if (!supabaseBaseUrlDIS || !supabaseKeyDIS) {
          return req.error(500, 'Missing DIS Supabase env variables.');
        }

        // Normalize base URLs
        const psaBase = supabaseBaseUrlPSA.endsWith('/')
          ? supabaseBaseUrlPSA
          : `${supabaseBaseUrlPSA}/`;

        const disBase = supabaseBaseUrlDIS.endsWith('/')
          ? supabaseBaseUrlDIS
          : `${supabaseBaseUrlDIS}/`;

        // Headers
        const psaHeaders = {
          apikey: supabaseKeyPSA,
          Authorization: `Bearer ${supabaseKeyPSA}`,
          'Content-Type': 'application/json'
        };

        const disHeaders = {
          apikey: supabaseKeyDIS,
          Authorization: `Bearer ${supabaseKeyDIS}`,
          'Content-Type': 'application/json'
        };

        // PSA fetch
        const psaUrl =
          `${psaBase}ZT_SHIPMENT_REPORT` +
          `?select=BolNo,ConsigneeNo`;

        // DIS fetch
        const disUrl =
          `${disBase}DIS_TBLSHIPPED` +
          `?select=Blading,Customer`;

        // Parallel fetch
        const [psaResponse, disResponse] = await Promise.all([
          fetch(psaUrl, { method: 'GET', headers: psaHeaders }),
          fetch(disUrl, { method: 'GET', headers: disHeaders })
        ]);

        if (!psaResponse.ok) {
          throw new Error(`ZT_SHIPMENT_REPORT HTTP Error: ${psaResponse.status}`);
        }

        if (!disResponse.ok) {
          throw new Error(`DIS_TBLSHIPPED HTTP Error: ${disResponse.status}`);
        }

        const psaData = await psaResponse.json();
        const disData = await disResponse.json();

        // Normalize helper
        const normalize = (val) => {
          if (val === null || val === undefined) return null;
          return String(val).trim();
        };

        // Maps
        const psaMap = new Map();
        const disMap = new Map();

        psaData.forEach((item) => {
          if (item.BolNo) {
            psaMap.set(normalize(item.BolNo), item);
          }
        });

        disData.forEach((item) => {
          if (item.Blading) {
            disMap.set(normalize(item.Blading), item);
          }
        });

        // Union of all BOLs
        const allBolNumbers = new Set([
          ...psaMap.keys(),
          ...disMap.keys()
        ]);

        const result = [];

        allBolNumbers.forEach((bolNumber) => {
          const psaRecord = psaMap.get(bolNumber);
          const disRecord = disMap.get(bolNumber);

          const psaConsignee = psaRecord
            ? normalize(psaRecord.ConsigneeNo)
            : null;

          const disCustomer = disRecord
            ? normalize(disRecord.Customer)
            : null;

          result.push({
            PSABolNo: psaRecord ? normalize(psaRecord.BolNo) : null,
            PSAConsigneeNo: psaConsignee,

            DISBlading: disRecord ? normalize(disRecord.Blading) : null,
            DISCustomer: disCustomer,

            Matched: Boolean(
              psaRecord &&
              disRecord &&
              psaConsignee === disCustomer
            )
          });
        });

        return result;

      } catch (error) {
        console.error('ShippedConsigneeBOLCheck Error:', error);

        return req.error(
          500,
          `Failed to fetch and compare consignee data: ${error.message}`
        );
      }
    });
    
  this.on('READ', PartNumberBOLCheck, async (req) => {
      try {

        // Validate environments
        if (!supabaseBaseUrlPSA || !supabaseKeyPSA) {
          return req.error(500, 'Missing PSA Supabase env variables.');
        }

        if (!supabaseBaseUrlDIS || !supabaseKeyDIS) {
          return req.error(500, 'Missing DIS Supabase env variables.');
        }

        // Normalize base URLs
        const psaBase = supabaseBaseUrlPSA.endsWith('/')
          ? supabaseBaseUrlPSA
          : `${supabaseBaseUrlPSA}/`;

        const disBase = supabaseBaseUrlDIS.endsWith('/')
          ? supabaseBaseUrlDIS
          : `${supabaseBaseUrlDIS}/`;

        // Headers
        const psaHeaders = {
          apikey: supabaseKeyPSA,
          Authorization: `Bearer ${supabaseKeyPSA}`,
          'Content-Type': 'application/json'
        };

        const disHeaders = {
          apikey: supabaseKeyDIS,
          Authorization: `Bearer ${supabaseKeyDIS}`,
          'Content-Type': 'application/json'
        };

        // PSA fetch
        const psaUrl =
          `${psaBase}ZT_SHIPMENT_REPORT` +
          `?select=BolNo,PartNumber`;

        // DIS fetch
        const disUrl =
          `${disBase}CCC_SHIPPEDTBLBOLPARTNUMBER` +
          `?select=Blading,PartNumber`;

        // Parallel fetch
        const [psaResponse, disResponse] = await Promise.all([
          fetch(psaUrl, { method: 'GET', headers: psaHeaders }),
          fetch(disUrl, { method: 'GET', headers: disHeaders })
        ]);

        if (!psaResponse.ok) {
          throw new Error(`ZT_SHIPMENT_REPORT HTTP Error: ${psaResponse.status}`);
        }

        if (!disResponse.ok) {
          throw new Error(`CCC_SHIPPEDTBLBOLPARTNUMBER HTTP Error: ${disResponse.status}`);
        }

        const psaData = await psaResponse.json();
        const disData = await disResponse.json();

        // Normalize helper
        const normalize = (val) => {
          if (val === null || val === undefined) return null;
          return String(val).trim();
        };

        // Maps (handle multiple PartNumbers per BOL → use Set)
        const psaMap = new Map();
        const disMap = new Map();

        psaData.forEach((item) => {
          const bol = normalize(item.BolNo);
          const part = normalize(item.PartNumber);

          if (bol && part) {
            if (!psaMap.has(bol)) psaMap.set(bol, new Set());
            psaMap.get(bol).add(part);
          }
        });

        disData.forEach((item) => {
          const bol = normalize(item.Blading);
          const part = normalize(item.PartNumber);

          if (bol && part) {
            if (!disMap.has(bol)) disMap.set(bol, new Set());
            disMap.get(bol).add(part);
          }
        });

        // Union of all BOLs
        const allBolNumbers = new Set([
          ...psaMap.keys(),
          ...disMap.keys()
        ]);

        const result = [];

        allBolNumbers.forEach((bolNumber) => {
          const psaParts = psaMap.get(bolNumber) || new Set();
          const disParts = disMap.get(bolNumber) || new Set();

          // Compare sets (exact match)
          const matched =
            psaParts.size === disParts.size &&
            [...psaParts].every((p) => disParts.has(p));

          result.push({
            PSABolNo: psaMap.has(bolNumber) ? bolNumber : null,
            PSAConsigneeNo: psaParts.size ? [...psaParts].join(', ') : null,

            DISBlading: disMap.has(bolNumber) ? bolNumber : null,
            DISCustomer: disParts.size ? [...disParts].join(', ') : null,

            Matched: matched
          });
        });

        return result;

      } catch (error) {
        console.error('PartNumberBOLCheck Error:', error);

        return req.error(
          500,
          `Failed to fetch and compare part numbers: ${error.message}`
        );
      }
    });

    
  
  this.on('READ', MaterialInformationCheck, async (req) => {
      try {

        if (!supabaseBaseUrlPSA || !supabaseKeyPSA) {
          return req.error(500, 'Missing PSA Supabase env variables.');
        }

        const psaBase = supabaseBaseUrlPSA.endsWith('/')
          ? supabaseBaseUrlPSA
          : `${supabaseBaseUrlPSA}/`;

        const headers = {
          apikey: supabaseKeyPSA,
          Authorization: `Bearer ${supabaseKeyPSA}`,
          'Content-Type': 'application/json'
        };

        // 🔹 PSA source
        const psaUrl =
          `${psaBase}ZT_BOX_FOR_BOL` +
          `?select=BoxNumber,MaterialDescription`;

        // 🔹 DIS (aggregated logic source)
        const disUrl =
          `${psaBase}ODS_VW_BOXED` +
          `?select=BoxNumber,MaterialDesc`;

        const [psaResponse, disResponse] = await Promise.all([
          fetch(psaUrl, { method: 'GET', headers }),
          fetch(disUrl, { method: 'GET', headers })
        ]);

        if (!psaResponse.ok) {
          throw new Error(`ZT_BOX_FOR_BOL HTTP Error: ${psaResponse.status}`);
        }

        if (!disResponse.ok) {
          throw new Error(`ODS_VW_BOXED HTTP Error: ${disResponse.status}`);
        }

        const psaData = await psaResponse.json();
        const disData = await disResponse.json();

        const normalize = (val) => {
          if (val === null || val === undefined) return null;
          return String(val).trim();
        };

        // ✅ PSA map (simple)
        const psaMap = new Map();
        psaData.forEach((item) => {
          if (item.BoxNumber) {
            psaMap.set(normalize(item.BoxNumber), item);
          }
        });

        // ✅ DIS grouping (IMPORTANT)
        const disGroupedMap = new Map();

        disData.forEach((item) => {
          const box = normalize(item.BoxNumber);
          const desc = normalize(item.MaterialDesc);

          if (!box) return;

          if (!disGroupedMap.has(box)) {
            disGroupedMap.set(box, []);
          }

          disGroupedMap.get(box).push(desc);
        });

        // ✅ APPLY SCENARIO LOGIC
        const disFinalMap = new Map();

        disGroupedMap.forEach((descList, boxNumber) => {

          // Scenario 1: ANY null
          const hasNull = descList.some(d => d === null);

          if (hasNull) {
            disFinalMap.set(boxNumber, null);
            return;
          }

          // Scenario 2: ALL SAME
          const uniqueValues = [...new Set(descList)];

          if (uniqueValues.length === 1) {
            disFinalMap.set(boxNumber, uniqueValues[0]);
          } else {
            // fallback if different values exist
            disFinalMap.set(boxNumber, uniqueValues.join(', '));
          }

        });

        // ✅ UNION of all BoxNumbers
        const allBoxNumbers = new Set([
          ...psaMap.keys(),
          ...disFinalMap.keys()
        ]);

        const result = [];

        allBoxNumbers.forEach((boxNumber) => {
          const psaRecord = psaMap.get(boxNumber);
          const disMaterialDesc = disFinalMap.get(boxNumber);

          const psaMaterial = psaRecord
            ? normalize(psaRecord.MaterialDescription)
            : null;

          result.push({
            PSABoxNumber: psaRecord ? normalize(psaRecord.BoxNumber) : null,
            PSAMaterialDescription: psaMaterial,

            DISBoxNumber: disFinalMap.has(boxNumber) ? boxNumber : null,
            DISMaterialDesc: disMaterialDesc,

            Matched: Boolean(
              psaMaterial &&
              disMaterialDesc &&
              psaMaterial === disMaterialDesc
            )
          });
        });

        return result;

      } catch (error) {
        console.error('MaterialInformationCheck Error:', error);

        return req.error(
          500,
          `Failed to process MaterialInformationCheck: ${error.message}`
        );
      }
    });

  });
