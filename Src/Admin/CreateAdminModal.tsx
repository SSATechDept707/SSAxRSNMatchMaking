import {useEffect} from "react";

export default function CreateAdminModal() {

    async function createAdmin(formData: any) {
        const res = await fetch("/api/admin", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(formData),
        })
    }

    return (
        <div></div>
    )
}

