import { GetServerSideProps } from "next";
import { setupAPIClient } from '../services/api'
import { destroyCookie } from 'nookies';
import { withSSRAuth } from "../utils/withSSRAuth";

export default function Metrics() {

    return (
        <>
            <h1>Metrics</h1>
        </>
    )
}

export const getServerSideProps: GetServerSideProps = withSSRAuth(async (ctx) => {
    const apiClient = setupAPIClient(ctx);
    const response = await apiClient.get('/me');
   
    return {
        props: {}
    }
}, {
    permissions: ['metrics.list3'],
    roles: ['administrator'],
})