import { SpaOutlined } from "@mui/icons-material";


const Footer:React.FC = () => {
    return (
        <div className="flex flex-col justify-center  bg-white dark:bg-gray-800  text-gray-900 dark:text-white items-center p-1">
            <p style={{
                
                fontSize: "12px",
                fontWeight: "bold",
                textAlign: "center",
                lineHeight: "16px",
                letterSpacing: "0.4px",
                opacity: "0.5" 
            }}>Copyright © 2025 CRM Massage. All rights reserved.</p>
            <SpaOutlined style={{
                
                fontSize: "24px",
                fontWeight: "bold",
                lineHeight: "16px",
                letterSpacing: "0.4px",
                opacity: "0.5"}}/>
        </div>
    );
}

export default Footer;