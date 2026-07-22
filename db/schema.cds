namespace psamonitoring.db;
entity FirstTable
{
    key ID : UUID;
    Status : String(100);
}
entity CheckpointEmbedding {
    key ID        : UUID @cuid;
        title     : String(111) @mandatory;
        discrepancy_data : LargeString;
        resolution     : String(5000);
        embedding : Vector = VECTOR_EMBEDDING(
            resolution, 'DOCUMENT', 'SAP_NEB.20240715'
        ) stored;
}