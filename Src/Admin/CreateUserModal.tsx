import { useEffect } from "react";

const userOptions = "member" | "candidate";

export default function CreateUserModal() {
    async function createUser() {
        const [candidateRes, memberRes] = await Promise.all([
            fetch("/api/candidates", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    // candidate data here
                }),
            }),
    
            fetch("/api/members", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    // member data here
                }),
            }),
        ]);
    }



    return (
        <div></div>
    )


}

