import {useEffect} from "react";

export default function CreateAdminModal() {

    async function createAdmin() {
        const res = await fetch("/api/admin", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                // admin data here
            }),
        })
    }

    return (
        <div></div>
    )
}

