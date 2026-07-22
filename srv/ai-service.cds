using {psamonitoring.db as db} from '../db/schema';


service AIService {

    action insertCheckpointEmbedding(
        title : String,
        resolution : String,
        discrepancy_data : LargeString
    ) returns String;

    action analyzeDiscrepancy(
        title : String,
        discrepancy_data : LargeString
    ) returns String;

    entity Search(query : String) as
        select from db.CheckpointEmbedding {
            ID,
            title,
            discrepancy_data,
            resolution,
            :query as query : String,
            cosine_similarity(
                embedding, to_real_vector(
                    vector_embedding(
                        :query, 'QUERY', 'SAP_NEB.20240715'
                    )
                )
            ) as cosine_similarity : String,
            l2distance(
                embedding, to_real_vector(
                    vector_embedding(
                        :query, 'QUERY', 'SAP_NEB.20240715'
                    )
                )
            ) as l2distance : String, 
        }
        order by
            cosine_similarity desc
        limit 5;
}