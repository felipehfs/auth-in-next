import { GetServerSideProps } from "next";
import { useContext } from "react"
import { AuthContext } from "../contexts/AuthContext"
import { setupAPIClient } from '../services/api'
import { destroyCookie } from 'nookies';
import { withSSRAuth } from "../utils/withSSRAuth";
import { useCan } from "../hooks/useCan";

export default function Dashboard() {
    const { user, signOut } = useContext(AuthContext);
    const userCanSeeMetrics = useCan({
        permissions: ['metrics.list'],
    });

    return (
        <div>
            <h1>Dashboard: {user?.email}</h1>
            <button onClick={signOut}>sign out</button>
            {userCanSeeMetrics && <div>Métricas</div>}
        </div>
    )
}

export const getServerSideProps: GetServerSideProps = withSSRAuth(async (ctx) => {
    const apiClient = setupAPIClient(ctx);
    try {
        const response = await apiClient.get('/me');

    }catch (err) {
        
        destroyCookie(ctx, 'nextauth.refreshToken');
        destroyCookie(ctx, 'nextauth.token');
        
        return { 
            redirect: {
                destination: '/',
                permanent: false
            }
        }
    }

    return {
        props: {}
    }
})