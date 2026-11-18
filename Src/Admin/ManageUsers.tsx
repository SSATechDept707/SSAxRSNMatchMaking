import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import CreateUserModal from "CreateUserModal";



export default function ManageUsers() {
const [candidates, setCandidates] = useState([]);
const [members, setMembers]  = useState([]);
const [ loading, setLoading]  = useState(true);
const [error, setError]  = useState("");


   async function getUsers() {
       try { 
        setLoading(true);
        senError("");

        const [candidateRes, memberRes] = await Promise.all([
            fetch("/api/candidates"),
            fetch("/api/members"),
        ]);


        if(!candidateRes.ok || !memberRes.ok) {
            throw new Error("Failed to load users");
        }

        const candidateData = await candidateRes.json();
        const memberCompanyData = await memberRes.json();


        setCandidates(candidateData);
        setMembers(memberCompanyData);
    
    } catch (e) {
        console.error(e);
        setError("Unable to load users.");
    } finally {
        setLoading(false);
    }
    }


    useEffect(() => {
        getUsers();
    })

    return (
        <div>

        </div>
    )

}