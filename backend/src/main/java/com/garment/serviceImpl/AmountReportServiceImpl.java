package com.garment.serviceImpl;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.garment.DTO.AmountReportRequestDTO;
import com.garment.DTO.AmountReportResponseDTO;
import com.garment.model.PurchaseEntryItem;
import com.garment.model.PurchaseOrderItem;
import com.garment.repository.PurchaseEntryItemRepository;
import com.garment.repository.PurchaseOrderItemRepository;
import com.garment.service.AmountReportService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AmountReportServiceImpl implements AmountReportService {
	 	private final PurchaseOrderItemRepository orderItemRepo;
	    private final PurchaseEntryItemRepository entryItemRepo;

	    @Override
	    public List<AmountReportResponseDTO> getAmountReport(AmountReportRequestDTO request) {
	        Long partyId = request.getPartyId();
	        LocalDate fromDate = LocalDate.parse(request.getFromDate());
	        LocalDate toDate = LocalDate.parse(request.getToDate());

	        // Fetch Debit and Credit data
	        List<PurchaseOrderItem> orderItems = orderItemRepo.findItemsByPartyId(partyId);
	        List<PurchaseEntryItem> entryItems = entryItemRepo.findByPurchaseEntryPartyId(partyId);

	        Map<LocalDate, AmountReportResponseDTO> reportMap = new HashMap<>();

	     // Purchase Orders (Debit)
	        for (PurchaseOrderItem order : orderItems) {
	            if (order.getPurchaseOrder() == null || order.getPurchaseOrder().getDate() == null) continue;

	            LocalDate orderDate = order.getPurchaseOrder().getDate();  // ✅ no parse
	            if (orderDate.isBefore(fromDate) || orderDate.isAfter(toDate)) continue;

	            AmountReportResponseDTO dto = reportMap.getOrDefault(orderDate,
	                new AmountReportResponseDTO(orderDate.toString(), "", 0.0, 0.0, 0.0));

	            dto.setNarration("Invoice #" + order.getPurchaseOrder().getId());
	            dto.setDebit(dto.getDebit() + (order.getAmount() != null ? order.getAmount() : 0.0));

	            reportMap.put(orderDate, dto);
	        }

	        // Purchase Entries (Credit)
	        for (PurchaseEntryItem entry : entryItems) {
	            if (entry.getPurchaseEntry() == null || entry.getPurchaseEntry().getDate() == null) continue;

	            LocalDate entryDate = entry.getPurchaseEntry().getDate();  // ✅ no parse
	            if (entryDate.isBefore(fromDate) || entryDate.isAfter(toDate)) continue;

	            AmountReportResponseDTO dto = reportMap.getOrDefault(entryDate,
	                new AmountReportResponseDTO(entryDate.toString(), "", 0.0, 0.0, 0.0));

	            dto.setNarration("Payment Received");
	            dto.setCredit(dto.getCredit() + (entry.getAmount() != null ? entry.getAmount() : 0.0));

	            reportMap.put(entryDate, dto);
	        }


	  // Calculate running balance
	     double balance = 0.0;
	     List<AmountReportResponseDTO> finalList = new ArrayList<>();

	     for (LocalDate date : reportMap.keySet().stream().sorted().toList()) {
	         AmountReportResponseDTO dto = reportMap.get(date);
	         balance += dto.getDebit() - dto.getCredit();
	         dto.setBalance(balance);
	         finalList.add(dto);
	     }

	     return finalList;
	    }
}
