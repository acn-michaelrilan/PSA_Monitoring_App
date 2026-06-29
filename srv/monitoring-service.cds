
service BoxService {

  entity AvailableBoxCheck {
   key PSABoxNumber: String(20);
    PSAStatus: String(20);
    DISBoxNumber: String(20);
    DISProcessed: String(20);
    Matched: Boolean;
  }

  
  entity ShippedBolCheck {
   key PSABolNo: String(20);
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

  entity ShippedConsigneeBOLCheck {
   key PSABolNo: String(20);
    PSAConsigneeNo: String(20);
    DISBlading: String(20);
    DISCustomer: String(20);
    Matched: Boolean;
  }

  entity PartNumberBOLCheck {
   key PSABolNo: String(20);
    PSAConsigneeNo: String(20);
    DISBlading: String(20);
    DISCustomer: String(20);
    Matched: Boolean;
  }


  entity MaterialInformationCheck {
   key PSABoxNumber: String(20);
    PSAMaterialDescription: String(20);
    DISBoxNumber: String(20);
    DISMaterialDesc: String(20);
    Matched: Boolean;
  }
}
