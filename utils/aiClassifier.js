const Department = require('../models/Department');

/**
 * Classifies a complaint using AI (OpenRouter)
 * @param {string} title - Complaint title
 * @param {string} description - Complaint description
 * @returns {Promise<{category: string, priority: string, departmentId: string|null}>}
 */
const classifyComplaint = async (title, description) => {
    try {
        const departments = await Department.find({}, 'name _id');
        const deptList = departments.map(d => `${d.name} (ID: ${d._id})`).join(', ');

        const prompt = `
        You are an AI assistant for a Complaint Management System.
        Analyze the following complaint and classify it.
        
        Title: ${title}
        Description: ${description}
        
        Available Departments: ${deptList}
        
        Rules:
        1. Select the most appropriate department from the list.
        2. Determine priority: Low, Medium, High, or Critical.
        3. Determine category: (Should match the department name or be a concise label).
        
        Return ONLY a JSON object with this structure:
        {
            "category": "category name",
            "priority": "Low/Medium/High/Critical",
            "departmentId": "the_mongo_id_of_the_department"
        }
        `;

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "HTTP-Referer": "http://localhost:5000", // Required by OpenRouter
                "X-Title": "SmartCMS",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": "google/gemini-2.0-flash-lite-preview-02-05:free", // Using a fast, free model
                "messages": [
                    { "role": "user", "content": prompt }
                ]
            })
        });

        const data = await response.json();
        const content = data.choices[0].message.content.trim();
        
        // Extract JSON if AI wraps it in markdown blocks
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        
        return JSON.parse(content);
    } catch (error) {
        console.error('AI Classification Failed:', error.message);
        return null; // Fallback to manual routing
    }
};

module.exports = classifyComplaint;