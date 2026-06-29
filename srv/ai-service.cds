service AIKnowledgeService {

    action saveIncident(
        scenario    : String,
        description : LargeString,
        resolution  : LargeString
    ) returns String;

}