
using { cuid } from '@sap/cds/common';
service MonitoringService @(path: '/monitoring-service') {
  entity AvailableBoxCheck : cuid {
    DISBoxNumber: String(20);
    PSAStatus: String(20);
    PSABoxNumber: String(20);
    DISProcessed: String(20);
    Matched: Boolean;
  }

  
  entity ShippedBolCheck: cuid {
    PSABolNo: String(20);
    PSATotalUnits: String(20);
    PSATotalVolume: String(20);
    PSATotalBoxes: String(20);
    DISBlading: String(20);
    DISTotalUnits: String(20);
    DISTotalVolume: String(20);
    DISTotalBoxes: String(20);
    MatchedUnits: Boolean;
    MatchedVolume: Boolean;
    MatchedBoxes: Boolean;
  }

  entity ShippedConsigneeBOLCheck: cuid {
    PSABolNo: String(20);
    PSAConsigneeNo: String(20);
    DISBlading: String(20);
    DISCustomer: String(20);
    Matched: Boolean;
  }

  entity PartNumberBOLCheck:cuid {
    PSABolNo: String(20);
    PSAPartNumber: String(20);
    DISBlading: String(20);
    DISPartNumber: String(20);
    Matched: Boolean;
  }


  entity MaterialInformationCheck:cuid {
    PSABoxNumber: String(20);
    PSAMaterialDescription: String(20);
    DISBoxNumber: String(20);
    DISMaterialDesc: String(20);
    Matched: Boolean;
  }
}
