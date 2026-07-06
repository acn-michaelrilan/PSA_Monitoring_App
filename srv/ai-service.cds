using { cuid } from '@sap/cds/common';

service AIService {

    action askAI(
        prompt : String
    ) returns String;

}