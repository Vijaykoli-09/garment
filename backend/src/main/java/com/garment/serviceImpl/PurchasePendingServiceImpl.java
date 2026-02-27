package com.garment.serviceImpl;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.garment.DTO.PurchasePendingRequest;
import com.garment.DTO.PurchasePendingRowDTO;
import com.garment.repository.PurchasePendingRepository;
import com.garment.repository.PurchasePendingRepository.PendingRowProjection;
import com.garment.service.PurchasePendingService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PurchasePendingServiceImpl implements PurchasePendingService {
	private final PurchasePendingRepository repo;

	  @Override
	  public List<PurchasePendingRowDTO> getPending(PurchasePendingRequest req) {
		  var rows = repo.findPendingReport(
				    req.getDate(),
				    req.getPartyIds(), (req.getPartyIds() == null || req.getPartyIds().isEmpty()),
				    req.getItemIds(),  (req.getItemIds()  == null || req.getItemIds().isEmpty())
				);


	    return rows.stream()
	        .map(this::map)
	        .collect(Collectors.toList());
	  }

	  private PurchasePendingRowDTO map(PendingRowProjection p) {
	    return new PurchasePendingRowDTO(
	        p.getId(),
	        p.getOrderNo(),
	        p.getOrderDate(),
	        p.getPartyName(),
	        p.getItemName(),
	        round(p.getOrderReceived()),
	        round(p.getOrderDelivered()),
	        round(p.getOrderPending())
	    );
	  }

	  private Double round(Double v) { return v == null ? 0d : Math.round(v * 1000d) / 1000d; }

	  @Override public List<Object[]> getFilterParties() { return repo.distinctPartiesFromPO(); }
	  @Override public List<Object[]> getFilterItems()   { return repo.distinctItemsFromPO(); }
}
