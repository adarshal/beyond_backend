
//add nodemailer or other functionality to send alerts
export class AlertingServices {
    private listeners: { [eventName: string]: Function[] } = {};
  
    public registerListener(eventName: string, listener: Function) {
      if (!this.listeners[eventName]) {
        this.listeners[eventName] = [];
      }
      this.listeners[eventName].push(listener);
    }
  
    public triggerAlert(eventName: string, data: any) {
      if (this.listeners[eventName]) {
        this.listeners[eventName].forEach((listener) => listener(data));
      }
    }
  
    public sendInvalidCheckpointAlert(baggageId: string,scannedLocation: string, expectedPath: string[],  actualPath: string[]  ) {
      this.triggerAlert('invalid-checkpoint', { baggageId, expectedPath ,actualPath});
    }
  }
  
 
  
// alert fun forr testing-only
export function sendInvalidCheckpointAlertTest(baggageId: string, expectedLocation: string) {
    // Implement logic to send notification (email, SMS, push) to frontend or designated recipients
    console.log(`Alert: Invalid checkpoint for bag ${baggageId}, expected location: ${expectedLocation}`);
  }
  export default AlertingServices;