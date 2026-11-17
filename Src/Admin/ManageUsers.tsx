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

        const [candidateRes, MemberRes] = await Promise.all([
            fetch("/api/candidates"),
            fetch("/api/members"),
        ]);


        if(!candidateRes.ok || !MemberRes.ok) {
            throw new Error("Failed to load users");
        }

        const candidatedata = await candidateRes.json();
        const memberCompan
    
    } catch (e) {

    }
    }



    return (
        <div>

        </div>
    )

}